const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const publicRoot = path.join(projectRoot, "public");
const pageNames = [
    "index.html",
    "about.html",
    "aboutdev.html",
    "auth.html",
    "onboarding.html",
    "dashboard.html",
    "profile.html",
    "journey.html"
];

function read(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("every user-facing page declares a responsive viewport", () => {
    for (const pageName of pageNames) {
        const html = fs.readFileSync(path.join(publicRoot, pageName), "utf8");
        assert.match(
            html,
            /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1(?:\.0)?">/i,
            `${pageName} needs a device-width viewport`
        );
    }
});

test("authenticated pages use the responsive shared shell", () => {
    for (const pageName of ["dashboard.html", "profile.html", "journey.html"]) {
        const html = fs.readFileSync(path.join(publicRoot, pageName), "utf8");
        assert.match(html, /href="css\/layout\.css"/);
        assert.match(html, /href="css\/sidebar\.css"/);
        assert.match(html, /id="sidebar-container"/);
    }

    const layout = read("public/css/layout.css");
    const sidebar = read("public/css/sidebar.css");
    const layoutScript = read("public/js/layout.js");
    assert.match(layout, /@media\s*\(max-width:\s*900px\)/);
    assert.match(layout, /flex-direction:\s*column/);
    assert.match(sidebar, /overflow-x:\s*auto/);
    assert.match(layoutScript, /aria-current/);
});

test("each signed-in view has page-specific compact layouts", () => {
    const dashboard = read("public/css/dashboard.css");
    const profile = read("public/css/profile.css");
    const journey = read("public/css/journey.css");
    const onboarding = read("public/css/onboarding.css");

    assert.match(dashboard, /@media\s*\(max-width:\s*520px\)/);
    assert.match(dashboard, /\.task-input\s*\{\s*flex-direction:\s*column/s);
    assert.match(profile, /@media\s*\(max-width:\s*480px\)/);
    assert.match(journey, /@media\s*\(max-width:\s*560px\)/);
    assert.match(journey, /\.analytics-highlight\s*\{\s*grid-template-columns:\s*1fr/s);
    assert.match(onboarding, /@media\s*\(max-width:\s*420px\)/);
});

test("public coverage sections collapse cleanly on phone-sized screens", () => {
    const style = read("public/css/style.css");

    assert.match(style, /\.proof-bar__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\)/s);
    assert.match(style, /@media\s*\(max-width:\s*720px\)[\s\S]*?\.proof-bar__grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
    assert.match(style, /@media\s*\(max-width:\s*720px\)[\s\S]*?\.coverage-grid[\s\S]*?grid-template-columns:\s*1fr/s);
    assert.match(style, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.pathway-panel\s*\{[^}]*grid-template-columns:\s*1fr/s);
    assert.match(style, /html\s*\{[^}]*overflow-x:\s*clip/s);
    assert.match(style, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.roadmap-preview\s*\{[^}]*width:\s*100%[^}]*overflow:\s*hidden/s);
    assert.match(style, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.preview-step strong\s*\{[^}]*white-space:\s*normal/s);
    assert.match(style, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.site-nav \.button\s*\{[^}]*max-width:\s*72px/s);
    assert.match(style, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.home-hero__grid\s*\{[^}]*display:\s*block/s);
});

test("sidebar includes only destinations that exist", () => {
    const sidebar = read("public/components/sidebar.html");
    const links = [...sidebar.matchAll(/href="([^"]+\.html)"/g)].map(match => match[1]);

    assert.ok(links.length > 0);
    for (const link of links) {
        assert.ok(fs.existsSync(path.join(publicRoot, link)), `missing sidebar page ${link}`);
    }

    assert.doesNotMatch(sidebar, /documents\.html|tasks\.html|settings\.html/);
});
