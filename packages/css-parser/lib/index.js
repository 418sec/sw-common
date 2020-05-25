'use strict';
const absorbNumeric = require('./numeric');
const absorbComment = require('./comments');
const absorbHash = require('./hash')
const absorbString = require('./string')
const absorbWS = require('./white-space');
const composeCDCToken = require('./cdc');
const composeCDOToken = require('./cdo');
const absorbIdentLike = require('./ident');
const absorbAtToken = require('./attoken');

const { isEscapeStart, isIdcp, isNumberStart, isIdStart, isWS, isDigit, isNameStart } = require('./checks-and-definitions');
const tk = require('./tokens')

function pick(iter, n) {
    const step = iter.peek();
    const rc = Array.from({ length: n });
    for (let i = 0; i < rc.length; i++) {
        rc[i] = step.value;
        iter.next();
    }
    return rc;
}

function createSingleCPToken(_1, token =tk.DEMIM ){
    const l = { loc: { o: _1.o, col: _1.col, row: _1.row } };
    return { id: token, d: _1.d, s: l, e: l };
}
// 4.3.1. Consume a token
//https://www.w3.org/TR/css-syntax-3/#consume-token
module.exports = function* tokenize(src = '') {

    const iterator = createIterator(src);
    // enhanced iterator "step" run-time linked with current state of iterator 
    // value and done are "getter" methods
    const step = iterator.next();
    for(;;){
        if (step.done) {
            return;
        }
        let _1 = step.value;
        // comments
        if (_1.d === '/') {
            iterator.next()
            let _2 = step.value;
            if (_2.d === '*') { // absorb comments
                yield absorbComment(_1, _2, iterator);
                continue
            }
        }
        // whitespace
        if (isWs(_1.d)) {
            yield absorbWS(iterator);
            continue;
        }
        // (") double quotation mark
        if (_1.d === '"') {
            yield absorbString(iterator);
            continue;
        }
        // hashtoken
        if (_1.d === '#') {
            let ok = false;
            iterator.next();
            const _2 = step.value;
            // can be an escape
            if (_2.d === '\\') {
                iterator.next();
                const _3 = step.value;
                iterator.reset(_2.o, _2.col, _2.row); // reset back to _2
                if (isEscapeStart(_2, _3)) {
                    ok = true;
                }
            }
            if (isIdcp(_2.d)) {
                ok = true;
            }
            // at this point, if "ok" is true, then process hash
            if (ok) {
                yield absorbHash(_1, iterator);
                continue;
            }
        }
        // (') single quotation mark
        if (_1.d === '\'') {
            yield absorbString(iterator);
            continue;
        }
        // "(" left parenthesis
        if (_1.d === '(') {
            yield createSingleCPToken(_1);
            iterator.next();
            continue;
        }
        // ")" right parenthesis
        if (_1.d === ')') {
            yield createSingleCPToken(_1);
            iterator.next();
            continue;
        }
        if (_1.d === '+') {
            [_2, _3] = pick(iter, 2);
            iter.reset(_1.o, _1.col, _1.row);
            if (isNumberStart(_1, _2, _3)) {
                yield absorbNumeric(iterator);
                continue
            }
        }
        if (_1.d === ',') {
            yield createSingleCPToken(_1);
            iterator.next();
            continue
        }
        if (_1.d === '-') {
            [_2, _3] = pick(iter, 2);
            iter.reset(_1.o, _1.col, _1.row);
            if (isNumberStart(_1, _2, _3)) {
                yield absorbNumeric(iterator);
                continue
            }
            const cdc =  composeCDCToken(_1,_2,_3);
            if (cdc){
                yield cdc;
                iter.reset(_3.o,_3.col, _3.row);
                iter.next();
                continue;
            }
            if (isIdStart(_1,_2,_3)){
                yield absorbIdentLike(iter); //function or ident
                continue;
            }
        }
        //
        if (_1.d === '.') {
            const [_2, _3] = pick(iter, 2);
            iter.reset(_1.o, _1.col, _1.row);
            if (isNumberStart(_1, _2, _3)) {
                yield absorbNumeric(iterator);
                continue
            }
            yield delimToken(_1);
            iterator.next();
            continue;
        }
        // here 
        if (_1.d === ':') {
            yield createSingleCPToken(_1, tk.COLON);
            iterator.next();
            continue;
        }
        if (_1.d === ';') {
            yield createSingleCPToken(_1, tk.SEMICOLON);
            iterator.next();
            continue;
        }
        if (_1.d === '<') {
            const [_2, _3] = pick(iter, 2);
            iter.reset(_1.o, _1.col, _1.row);
            const tok = composeCDOToken(_1,_2,_3);
            if (tok){
                yield tok;
                iter.reset(_3.o, _3.col, _3.row);
                iter.next();
                continue;
            }
        }
        if (_1.d === '@') {
            const [_2, _3, _4] = pick(iter, 3);
            iter.reset(_1.o, _1.col, _1.row);
            if(isIdStart(_2,_3,_4)){
                yield absorbAtToken(iter);
                continue;    
            }
            yield createSingleCPToken(_1);
            iter.next();
            continue;
        }
        if (_1.d === '[') {
            yield createSingleCPToken(_1, tk.LEFTSB_TOKEN);
            iter.next();
            continue;
        }
        if (_1.d === '\\') {
            const [_2, _3] = pick(2);
            iter.reset(_1.o, _1.col, _1.row);
            if (isIdStart(_1,_2,_3)){
                yield absorbIdentLike(iter); //function or ident
                continue;
            }
            // parse error
            yield createSingleCPToken(_1);
            iter.next();
            continue;
        }
        if (_1.d === ']'){
            yield createSingleCPToken(_1, tk.RIGHTSB_TOKEN);
            iter.next();
            continue;
        }
        if (_1.d === '{'){
            yield createSingleCPToken(_1, tk.LEFTCB_TOKEN);
            iter.next();
            continue;
        }
        if (_1.d === '}'){
            yield createSingleCPToken(_1, tk.RIGHTCB_TOKEN);
            iter.next();
            continue;
        }
        if (isDigit(_1.d)){
            yield absorbNumeric(iter);
            continue;
        }
        if (isNameStart(_1.d)){
            yield absorbIdentLike(iter)
            continue;
        }
        yield createSingleCPToken(_1);
        iter.next();
    }
}
