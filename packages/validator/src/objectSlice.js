const { tokens } = require('./tokenizer');
const isObject = require('./isObject');

module.exports = function objectSlice(object, selector, cursor = 0) {
    if (selector.length === cursor){
        return [object];
    }
    const rc = [];
    const instr = selector[cursor];
    switch (instr.token) {
        case tokens.SLASH:
            const rcSub = objectSlice(object, selector, cursor + 1);
            rc.push(...rcSub);
            break;
        case tokens.PATHPART:
            const value = object[instr.value];
            if (value === undefined) {
                break;
            }
            if (Array.isArray(value)) {
                if (cursor === selector.length - 1){ // performance enhancement
                    rc.push(...value);
                    break;
                }
                for (const item of value) {
                    const rcSub = objectSlice(item, selector, cursor + 1);
                    rc.push(...rcSub);
                }
                break;
            }
            if (isObject(value)) {
                const rcSub = objectSlice(value, selector, cursor + 1);
                rc.push(...rcSub);
                break;
            }
            rc.push(value);
            break;
        default:
            throw new TypeError(`selector is an incorrect token ${JSON.stringify(instr)}`);
    }
    return rc;
}