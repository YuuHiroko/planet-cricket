const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });

dom.window.document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired!");
});

setTimeout(() => {
    console.log("Errors: ", dom.window.document.errors);
}, 2000);
