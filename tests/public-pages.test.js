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
            "Saskatchewan", "New Brunswick", "Nova Scotia",
            "Prince Edward Island", "Newfoundland and Labrador",
            "Yukon", "Northwest Territories"
        ]){
            assert.match(html, new RegExp(province), `${pageName} is missing ${province}`);
        }
    }
});

test("onboarding uses the three journey states and a progressive PNP flow", () => {
    const html = readPublic("onboarding.html");
    const script = readPublic("js/onboarding.js");

    for(const type of ["planning", "pathway", "completed"]){
        assert.match(html, new RegExp(`data-journey-type="${type}"`));
    }
    assert.match(html, /id="pathway-step"/);
    assert.match(html, /id="province-step"/);
    assert.match(html, /id="stream-step"/);
    assert.match(html, /When did you start working toward this pathway\?/);
    assert.match(html, /When did you become a permanent resident\?/);
    assert.doesNotMatch(html, /Highest Education|Journey Start Date/);
    assert.match(script, /streamsForProvince/);
    assert.match(script, /state\.options\.streamProvinces/);
    assert.match(script, /state\.pathway === PNP_PATHWAY/);
});

test("profile data supports the new plain-language onboarding dates", () => {
    const model = fs.readFileSync(path.join(__dirname, "..", "models", "User.js"), "utf8");
    const options = fs.readFileSync(path.join(__dirname, "..", "data", "immigrationOptions.js"), "utf8");
    assert.match(model, /canadaArrivalDate:\s*Date/);
    assert.match(model, /permanentResidenceDate:\s*Date/);
    assert.match(options, /canadaStatuses:/);
    assert.match(options, /applicationStatuses:/);
});

test("dashboard restores useful sections with live roadmap data", () => {
    const html = readPublic("dashboard.html");
    const script = readPublic("js/dashboard.js");
    const sidebar = readPublic("components/sidebar.html");

    for(const id of ["documents", "activity", "tasks"]){
        assert.match(html, new RegExp(`id="${id}"`));
        assert.match(sidebar, new RegExp(`dashboard\\.html#${id}`));
    }
    assert.match(script, /\/api\/journey\/\$\{pathway\}\/\$\{stream\}/);
    assert.match(script, /\/api\/journey\/progress\//);
    assert.match(script, /\/api\/timeline\//);
    assert.match(script, /requiredDocuments/);
});

test("dashboard tasks are stored on the user instead of server memory", () => {
    const model = fs.readFileSync(path.join(__dirname, "..", "models", "User.js"), "utf8");
    const route = fs.readFileSync(path.join(__dirname, "..", "routes", "taskRoutes.js"), "utf8");
    assert.match(model, /dashboardTasks:/);
    assert.match(route, /User\.findOne/);
    assert.match(route, /crypto\.randomUUID/);
    assert.doesNotMatch(route, /tasksByUser|new Map\(/);
});

test("homepage coverage counts match and follow the options API", () => {
    const html = readPublic("index.html");
    const script = readPublic("js/home.js");

    assert.match(html, /id="express-entry-count">3<\/strong>/);
    assert.match(html, /id="pnp-province-count">11<\/strong>/);
    assert.match(html, /<span>PNP jurisdictions<\/span>/);
    assert.doesNotMatch(html, />4<\/strong><span>provincial programs<\/span>/);
    assert.match(html, /src="js\/home\.js"/);
    assert.match(script, /fetch\("\/api\/options"\)/);
    assert.match(script, /new Set/);
    assert.match(script, /options\.streamProvinces/);
});
