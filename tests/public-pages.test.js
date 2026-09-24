const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const publicRoot = path.join(__dirname, "..", "public");
const pageNames = ["index.html", "about.html", "aboutdev.html", "auth.html"];

function readPublic(relativePath) {
    return fs.readFileSync(path.join(publicRoot, relativePath), "utf8");
}

test("public pages use the shared accessible site shell", () => {
    for (const pageName of pageNames) {
        const html = readPublic(pageName);

        assert.match(html, /<!DOCTYPE html>/i, `${pageName} needs an HTML doctype`);
        assert.match(html, /<meta name="viewport"/i, `${pageName} needs a responsive viewport`);
        assert.match(html, /href="css\/style\.css"/i, `${pageName} must use the public stylesheet`);
        assert.match(html, /class="skip-link"/i, `${pageName} needs a skip link`);
        assert.match(html, /id="main-content"/i, `${pageName} needs a main content target`);
        assert.doesNotMatch(html, /\sstyle="/i, `${pageName} must work with the production CSP`);
    }
});

test("every local public-page link and asset resolves", () => {
    for (const pageName of pageNames) {
        const html = readPublic(pageName);
        const references = [...html.matchAll(/(?:href|src)="([^"]+)"/gi)]
            .map(match => match[1])
            .filter(reference =>
                !reference.startsWith("#") &&
                !reference.startsWith("http://") &&
                !reference.startsWith("https://")
            );

        for (const reference of references) {
            const filePath = reference.split(/[?#]/)[0];
            assert.ok(
                fs.existsSync(path.join(publicRoot, filePath)),
                `${pageName} references missing file ${filePath}`
            );
        }
    }
});

test("authentication markup preserves the JavaScript contract", () => {
    const html = readPublic("auth.html");
    const requiredIds = [
        "signup-tab",
        "login-tab",
        "signup-form",
        "login-form",
        "signup-username",
        "signup-password",
        "login-username",
        "login-password",
        "signup-message",
        "login-message"
    ];

    for (const id of requiredIds) {
        assert.match(html, new RegExp(`id="${id}"`), `auth.html is missing #${id}`);
    }

    assert.match(html, /minlength="8"/, "new passwords need the production minimum length");
    assert.match(html, /src="js\/auth\.js"/, "auth.html must load its controller");
});

test("public coverage lists include every supported PNP province", () => {
    for(const pageName of ["index.html", "about.html"]){
        const html = readPublic(pageName);
        for(const province of [
            "Alberta", "British Columbia", "Manitoba", "Ontario",
            "Saskatchewan", "New Brunswick"
        ]){
            assert.match(html, new RegExp(province), `${pageName} is missing ${province}`);
        }
    }
});

test("onboarding loads pathway and province choices from the options API", () => {
    const script = readPublic("js/onboarding.js");
    assert.match(script, /replaceSelectOptions\(\s*pathwayInput,\s*OPTIONS\.pathways/);
    assert.match(script, /replaceSelectOptions\(\s*provinceInput,\s*OPTIONS\.provinces/);
    assert.match(script, /OPTIONS\.streamProvinces/);
});
