const {
  relative,
  resolve
} = require('path');
const parse5 = require('parse5');
const ta = require('parse5/lib/tree-adapters/default');
const hmtl = require('parse5/lib/common/html');
const {
  NAMESPACES: {
    HTML
  }
} = require('parse5/lib/common/html');

// remove now the colors
require('colors');

function normalizeAttrProps(attr) {
  return Object.entries(attr || {}).map(([p, v]) => [p && p.toLowerCase(), 
    v && typeof v === 'string' && v.toLowerCase() || v 
   ]).sort((a, b) => {
    if (a[0] < b[0]) return -1;
    if (a[0] > b[0]) return 1;
    return 0;
  });
}

function metaIsEaual(m1, m2) {
  //normalize
  const n1 = normalizeAttrProps(m1);
  const n2 = normalizeAttrProps(m2);
  if (n1.length !== n2.length) return false;
  let i = 0;
  while (n1[i][0] === n2[i][0] && n1[i][1] === n2[i][1] && i < n1.length) {
    i++
  }
  if (i === n1.length) return true;
  return false;
}


function renderHTML(lang = 'en', title = 'rollup app', metas = [{}], links = {}) {
  const doc = ta.createDocument();
  const html = ta.createElement('html', HTML, [{
    name: 'lang',
    value: lang
  }])
  ta.appendChild(doc, html);
  const head = ta.createElement('head', HTML, []);
  ta.appendChild(html, head);
  const titleElt = ta.createElement('title', HTML, []);
  ta.insertText(titleElt, title);
  ta.appendChild(head, titleElt);
  //
  {
    // dedup metas
    const uniqueMeta = [];
    for (const meta of metas) {
      const found = uniqueMeta.find(m => {
        return metaIsEaual(m, meta);
      });
      if (found) continue;
      uniqueMeta.push(meta);
    }
    for (const meta of uniqueMeta) {
      const metaElt = ta.createElement('meta', HTML, normalizeAttrProps(meta).map(e => ({
        name: e[0],
        value: e[1] === undefined ? '' : String(e[1])
      })));
      ta.appendChild(head, metaElt);
    }
  }


  console.log(parse5.serialize(doc).blue);
}


const addSuffix = (path, suffix) => {
  if (!suffix) return path;

  const param = suffix === true ? `s=${Date.now()}` : suffix;
  return `${path}?${param}`;
};

const forceArray = a => Array.isArray(a) ? a : [a];

function node(nodeName, tagName, attrs = [], namespaceURI = 'http://www.w3.org/1999/xhtml', childNodes = []) {
  return {
    nodeName,
    tagName,
    attrs,
    namespaceURI,
    childNodes
  }
}

function titleNode(title, parent) {
  const p = node('title', 'title');
  p.childNodes.push(textNode(title, p));
  return p;
}

function textNode(str, parent) {
  return {
    nodenName: '#text',
    value: str,
    parentNode: parent
  };
}


module.exports = function htmlGenerator({
  title = 'roolapp',
  fileName = 'index.html',
  inject,
  favicon,
  meta,
  links,
  mobile,
  showErrors,
  appMountId,
  baseHref,

  // planned
  // excludeChunks,
  // chunksSortMode
  // chunks
  // excludeChunks , will inject scripts and styles 
  // template
  // hash (querystring hash?)
  suffix = false,
} = {}, ) {

  // generate titleSnippet
  /*[ { nodeName: 'title',
  tagName: 'title',
  attrs: [],
  namespaceURI: 'http://www.w3.org/1999/xhtml',
  childNodes: [Array],
  parentNode: [Circular] } ],*/
  renderHTML('en', title, [{
      charset: 'utf-8'
    },
    {
      content: 'ie=edge',
      ['http-equiv']: 'x-ua-compatible'
    },
    {
      name: 'viewport',
      content: 'width=device-width',
      ['initial-scale']: '1'
    },
    {
      content: 'width=device-width, initial-scale=1',
      name: 'viewport'
    }
  ]);
  let cnt = 1;
  return {
    name: 'htmlGenerator',
    /*async load(id) {
      console.log('load'.red);
      console.log(`  ->[id]:${id}`.yellow);
      return 'console.log("hello world");';
    },*/
    async buildStart(io) {
      console.log('buildStart'.red);

    },
    async banner(a, b) {
      console.log('banner'.red);
      return '/* HELLO WOOOOOOOOORLD */'; // will be added to the text
    },
    buildEnd(error) {
      console.log('buildEnd'.red);
      error && console.log(`error is: ${String(error).green}`);
    },
    /*resolveId(source, importer) {
      console.log('resolveId'.red);
      console.log(`  ->[source][${source}]`.yellow);
      console.log(`  ->[importer][${importer}]`.yellow);
      return null;//hello.js';
    },*/

    async generateBundle(oo, bundle, isWrite) {
      // when isWrite is "false" then it will not be immediatly written to a file
      // so basicly generateBundle is 
      console.log(`generateBundle ${cnt++}`.red);
      console.log(`  ->options:${JSON.stringify(oo)}`.yellow);
      console.log(`  ->iswrite-flag:${JSON.stringify(isWrite)}`.yellow);

      for (const [entry, value] of Object.entries(bundle)) {
        //console.log(bundle)
        console.log(`  ${entry}->[type:${value.type}][code:${value.code || value.source}]`.yellow);
      }
      if (isWrite === true) {
        console.log('EMITTING ASSET'.red);
        this.emitFile({
          type: 'asset',
          source: '<htm><head></head><body></body></html>',
          name: 'index.html',
          //fileName: 'index.html'
        });
      }
      console.log('end of generateBundle'.red);
    },
    writeBundle(bundle) {
      console.log('writeBundle'.red);
      for (const [entry, value] of Object.entries(bundle)) {
        console.log(entry, value)
      }
    }


    /*async generateBundle( outputOptions , bundle, isWrite) {
      if (!dir) this.error('`opts.dir` is required!');

      // don't do anything when bundle isn't written
      if (!isWrite) return;

      // figure out paths
      const outputDir = relative(process.cwd(), resolve(dir));
      const relativeOutput = p => relative(outputDir, resolve(p));

      // create template data
      const scripts = forceArray(moreScripts).concat(addSuffix(relativeOutput(file), suffix));

      const styles = forceArray(moreStyles).concat(
        css && addSuffix(relativeOutput(css), suffix)
      )
      .filter(f => f);

      const templateData = {
        title,
        ...data,
        scripts,
        styles,
      };

      let templateFn;
      if (useDefault) {
        templateFn = doT.compile(defaultTemplate);
      } else {
        let userTemplate = await readFile(path, 'utf8').catch(err => this.error(err.toString()));

        if (useDoT) {
          // inject scripts and styles if the user template doesn't handle them
          [
            { arr: scriptsTemplate, hint: `${doT.templateSettings.varname}.scripts`, tag: '</body>' },
            { arr: stylesTemplate, hint: `${doT.templateSettings.varname}.styles`, tag: '</head>' },
          ].forEach(({ arr, hint, tag }) => {
            const matches = userTemplate.match(doT.templateSettings.iterate) || [];
            const shouldSkip = matches.some(str => str.includes(hint));
            if (shouldSkip) return;

            const tagClose = userTemplate.lastIndexOf(tag);
            userTemplate = [
              userTemplate.slice(0, tagClose),
              arr.join(''),
              userTemplate.slice(tagClose, userTemplate.length),
            ].join('');
          });
          templateFn = doT.compile(userTemplate);
        } else {
          templateFn = d => func(userTemplate, d);
        }
      }

      // generate and write html
      const html = `${templateFn(templateData).trim()}\n`;
      const htmlPath = resolve(outputDir, filename);
      await outputFile(htmlPath, html).catch(err => this.error(err.toString()));
    },*/
  };
}