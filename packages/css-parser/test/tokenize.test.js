const fs = require('fs');
const { resolve } = require('path');
// describe it expect
const chai = require('chai');
const { expect } = chai;
const createPreprocessorOverlay = require('../lib/tokenizer/preprocess');
const tokenizer = require('../lib/tokenizer')

const fixture = fs.readFileSync(require.resolve('./fixture.css'), 'utf8');
const source = createPreprocessorOverlay(fixture);



describe('token actual css', () => {

  let lexer;

  beforeEach(() => {
    lexer = tokenizer(source);
  })

  it('tokenstream test', () => {
    const arr = Array.from(lexer);
    console.log(arr);
  });
});