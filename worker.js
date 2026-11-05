// Serves the static site. Video clips get proper byte-range answers (206), which Safari
// and iPhone need to play a <video>; the static asset server alone always sends the whole file.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const range = request.headers.get("Range");
    const path = new URL(request.url).pathname;
    if (!range || res.status !== 200 || !/\.(mp4|webm)$/.test(path)) return res;
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) return res;
    let start, end;
    if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
    else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const h = new Headers(res.headers);
    h.set("Content-Range", `bytes ${start}-${end}/${size}`);
    h.set("Content-Length", String(end - start + 1));
    h.set("Accept-Ranges", "bytes");
    return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
  },
};
