# MaplePath

MaplePath is a Canadian immigration journey tracker built with HTML, CSS,
vanilla JavaScript, Express, Mongoose, and MongoDB Atlas. Users can create an
account, save a profile, follow an Express Entry or supported PNP roadmap, record step dates,
and compare completed-step durations with community timeline averages.

## Run locally

1. Install dependencies with `npm install`.
2. Set `MONGO_URI` in the ignored `.env` file. `PORT` is optional; the default is
   3000. Never commit `.env`.
3. Run `npm run dev` and open `http://localhost:3000`.

`npm start` runs the same server without nodemon. The server connects to
MongoDB and serves the API and files in `public/`.

The start scripts use Node's system certificate store for the Atlas TLS
connection on Windows. This preserves certificate verification; do not disable
TLS verification to work around a certificate error.

## Current journey support

The Journey page loads Express Entry CEC, FSWP, and FSTP roadmaps, plus the
Alberta Opportunity Stream and Manitoba Skilled Worker in Manitoba PNP
roadmaps. Supported streams and stable analytics keys are registered in
`data/roadmaps/registry.js`; adding a name to the profile options alone does
not create a working roadmap. CEC and the two PNP roadmaps have guidance with
official government links. FSWP and FSTP have the richer structure, but their
detailed guidance still needs review and authoring.

Saved Journey progress is keyed by the selected stream. Existing Express Entry
progress is associated with the user's selected Express Entry stream the first
time they open Journey or edit their profile after this update. Existing timeline
records and community averages keep their established EE profile keys. PNP
records use separate `PNP-AAIP-AOS` and `PNP-MPNP-SWM` keys. The new PNP roadmaps
follow the provincial nomination stage with the federal non-Express Entry PR
process; neither nomination guarantees PR approval. Manitoba nominees whose
nomination is linked to Express Entry must follow IRCC's Express Entry PNP
federal process instead of the non-Express Entry stages shown here.

Roadmap format and authoring rules are in `data/roadmaps/README.md`. Adding a
pathway to an options list does not by itself add a working Journey roadmap.

## Account sessions and data access

Login creates a seven-day, server-verified session. The browser receives an
`HttpOnly`, `SameSite=Strict` cookie; production HTTPS also marks it `Secure`.
The database stores only a hash of the random session token in the `sessions`
collection. Logout deletes that session. Existing accounts and journey records
do not need migration, but users signed in before this change must log in once
more to receive a session cookie.

Profile, tasks, journey, timeline, and analytics APIs require a valid session.
User-specific routes check the signed-in username on the server. Immigration
options remain public. Dashboard tasks are still temporary in-memory data;
they are isolated per account while the server is running and reset on restart.

Local development over `http://localhost` works without a `Secure` cookie.
Production must serve the entire app over HTTPS with `NODE_ENV=production`.
