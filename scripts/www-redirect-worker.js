export default {
  fetch(request) {
    const destination = new URL(request.url);
    destination.protocol = "https:";
    destination.hostname = "macroforge.site";
    destination.port = "";

    return Response.redirect(destination.toString(), 301);
  },
};
