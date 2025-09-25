# Changelog

## 1.0.0 (2025-09-25)


### Features

* add about, events, rooms pages ([fec7990](https://github.com/kagekun333/musiam-front/commit/fec7990bcb30f48db694448d0b7ed08c00ac1c51))
* add dynamic rooms route to eliminate 404s ([2e7dde0](https://github.com/kagekun333/musiam-front/commit/2e7dde019cf8e79e2ca37b715054397b63b09c4e))
* add events and rooms pages with data alias ([48a1fdf](https://github.com/kagekun333/musiam-front/commit/48a1fdf131255c2fe903aee63cab1a2e570535a7))
* **analytics:** initialize PostHog and expose track() ([eaf831f](https://github.com/kagekun333/musiam-front/commit/eaf831fc5038a0522772c2f76853829bcb6b7ac0))
* **chat:** add Groq chat API and /chat page ([11cb403](https://github.com/kagekun333/musiam-front/commit/11cb403c25047b7da46549c5892beb9683030746))
* **exhibition:** add wow_play tracking and keep minimal grid ([4ac142e](https://github.com/kagekun333/musiam-front/commit/4ac142ef22062003fa773743264d6cea5b26eba5))
* **gates:** images wired & pages stabilized ([d4a8395](https://github.com/kagekun333/musiam-front/commit/d4a83958892428ec3e9a247268d5d770536ad3c3))
* implement rooms/[slug] detail page (static params) ([ea810e3](https://github.com/kagekun333/musiam-front/commit/ea810e33c66791cb3803a1922fa418b8a89b7277))
* link event cards to /events/[id] with tracking ([333715a](https://github.com/kagekun333/musiam-front/commit/333715a3e7cc670c1e70bf42062f7ab86f338775))
* readmeに空行追加 ([150a0a6](https://github.com/kagekun333/musiam-front/commit/150a0a64763ea8086795358bea24a303054b827b))
* **reco:** enforce book+music+music; default calm; add X-Book-Lang/Fallback ([dcb6e90](https://github.com/kagekun333/musiam-front/commit/dcb6e901f000957e17b78987ddcc7336f8a8891c))
* setup PostHog analytics ([8aa6e84](https://github.com/kagekun333/musiam-front/commit/8aa6e8415a32224e3653bb317313597feb6fd97d))
* simplify homepage to Hello MUSIAM! ([2d12dbe](https://github.com/kagekun333/musiam-front/commit/2d12dbec3824620a2ae2f41c6e428d2806ceddeb))
* Three Gates landing + legacy home + stubs ([0a436d9](https://github.com/kagekun333/musiam-front/commit/0a436d9bc6b531ef905ccfa2fd5fe8f951feddf9))
* track CTA clicks on home (PostHog) ([5b1b91f](https://github.com/kagekun333/musiam-front/commit/5b1b91f22a1bd38d9a315b503fa91df3397c415f))
* wire mood tag generator tooling ([420fa63](https://github.com/kagekun333/musiam-front/commit/420fa63ffc154b1ed4ddb50693005ec0bfdb2eb5))


### Bug Fixes

* clean home page with correct imports ([674d654](https://github.com/kagekun333/musiam-front/commit/674d65422c0fefd090d48c8ac496bf67de8557ef))
* correct api_host key in posthog init ([e3d1fec](https://github.com/kagekun333/musiam-front/commit/e3d1fec59bfb6a66b997585971287bd8e4b53b98))
* **eslint:** flat config cleanup ([2dd1162](https://github.com/kagekun333/musiam-front/commit/2dd1162bb0b1cff11253df16bf620ea1958287f6))
* **eslint:** flat config without plugins array ([448a1b5](https://github.com/kagekun333/musiam-front/commit/448a1b54f8428e22db7c82e15ef25a93ef911824))
* **gates:** solid 3-card grid + click tracking ([67d4092](https://github.com/kagekun333/musiam-front/commit/67d40920a4bd696dde9e66d689470f9e06cdfba6))
* heredoc SQL + BODY build (no -d '') ([3fae138](https://github.com/kagekun333/musiam-front/commit/3fae1389868f01765811129d33c1b5fc52b48629))
* implement rooms/[slug] module to satisfy build ([fea54c7](https://github.com/kagekun333/musiam-front/commit/fea54c78e5b6934ca79a0d4b06442d8f599fd529))
* **kpi:** robust jq parsing for object/array result rows ([870b6fb](https://github.com/kagekun333/musiam-front/commit/870b6fb537de7144c5c9c1a296c2a6b3b57045e1))
* **lint:** no-control-regex and prefer-const in chat-reco ([b98ad76](https://github.com/kagekun333/musiam-front/commit/b98ad764b87caa41138a678edc54f9fba23e0c8f))
* **lint:** no-control-regex in titleLooksEnglish (use \\p{ASCII}) ([b597e1f](https://github.com/kagekun333/musiam-front/commit/b597e1f9252a7e9653c49e463277b92a2a7335aa))
* lock recommender.ts to spec version ([7357d2a](https://github.com/kagekun333/musiam-front/commit/7357d2a7855c05edf168af161469832bec2e165b))
* make '近日イベント' cards clickable with Link + tracking ([338e9c5](https://github.com/kagekun333/musiam-front/commit/338e9c531d55417a979685c36333067a3ebd4fe0))
* **oracle:** correct useEffect signature and SSR-safe localStorage ([49283d2](https://github.com/kagekun333/musiam-front/commit/49283d22e1b832e963987b0701f4d33489c7a009))
* **oracle:** replace &lt;img&gt; with next/image and drop unused setter ([062d5aa](https://github.com/kagekun333/musiam-front/commit/062d5aa3a454dd72632db851104041be28608b13))
* **pages:** ensure default exported page components and _app ([8b90d68](https://github.com/kagekun333/musiam-front/commit/8b90d68b2f83322de219cb2b98ed141f189e1cc2))
* remove duplicate Analytics import ([d6ce74d](https://github.com/kagekun333/musiam-front/commit/d6ce74d4ac6864664ef6c135644af088def0d1fd))
* remove duplicate DEBUG_KPI key ([d7ddb6c](https://github.com/kagekun333/musiam-front/commit/d7ddb6c9e1e820273bdf6b3c81c0d1c3ddfcd9f9))
* remove stray lib/lib and keep single lib/data.ts ([6bbfdae](https://github.com/kagekun333/musiam-front/commit/6bbfdae0c9154f4c8572fd01f7e1c642e593102c))
* replace &lt;a&gt; with Next.js <Link> in nav ([294d690](https://github.com/kagekun333/musiam-front/commit/294d6909e69df8710510da5d4247c80237aea1e1))
