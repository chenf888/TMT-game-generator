// Load the mod files, then start the game only after every layer has registered.
// Setting "async" through a string attribute still creates the boolean attribute
// (i.e. async=true), so mod files race; and dynamically inserted scripts do not
// reliably delay window.onload, so starting the game from <body onload> can read
// a half-built `layers` object.

(function () {
    var files = modInfo.modFiles;
    var remaining = files.length;
    var started = false;

    function start() {
        if (started) return;
        started = true;
        load();
    }

    function oneDone() {
        remaining -= 1;
        if (remaining > 0) return;
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start, { once: true });
    }

    if (!remaining) {
        if (document.readyState === "complete") start();
        else window.addEventListener("load", start, { once: true });
        return;
    }

    for (var i = 0; i < files.length; i++) {
        var script = document.createElement("script");
        script.src = "js/" + files[i];
        script.async = false;
        script.onload = oneDone;
        script.onerror = oneDone;
        document.head.insertBefore(script, document.getElementById("temp"));
    }
})();

