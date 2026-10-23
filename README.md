# Pip & Flicker — Privacy, Support and Terms

The site at https://pipandflicker.adrianburcin.com (Cloudflare Workers, static assets in `public/`).

Do not edit `public/` by hand: it is built from the game repo (`site/src/<lang>/*.md` →
`tools/build_site.py`) and copied here by `tools/publish_site.sh`, which commits and pushes.
Cloudflare deploys every push to `main`.
