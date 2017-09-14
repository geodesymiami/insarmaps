function CancellableAjax() {
    this.lastAjax = null;

    this.ajax = function(options, onCancel) {
        this.lastAjax = $.ajax(options);

        this.onceKeyDown(onCancel);
    };

    this.xmlHTTPRequestAjax = function(options, onCancel) {
        var xhr = new XMLHttpRequest();
        this.lastAjax = xhr;
        this.onceKeyDown(onCancel);
        xhr.open(options.type, options.url, options.async);
        if (options.responseType) {
            xhr.responseType = options.responseType;
        }
        if (options.requestHeader) {
            for (var key in options.requestHeader) {
                if (options.requestHeader.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, options.requestHeader[key]);
                }
            }
        }
        xhr.onload = function() {
            var response = null;
            // this logic comes from this dom exception when accessing responseText
            // Uncaught DOMException: Failed to read the 'responseText' property from 'XMLHttpRequest': The value is only accessible if the object's 'responseType' is '' or 'text' (was 'arraybuffer').
            // at XMLHttpRequest.xhr.onload
            if (xhr.responseType === "" || xhr.responseType === "text") {
                response = xhr.responseText;
            } else {
                response = xhr.response;
            }
            options.success(response);
        }
        xhr.onerror = options.error;
        if (options.data) {
            var fullQuery = "";
            for (var key in options.data) {
                if (options.data.hasOwnProperty(key)) {
                    fullQuery += key + "=" + options.data[key] + "&";
                }
            }
            xhr.send(fullQuery);
        } else {
            xhr.send();
        }
    };

    this.after = null;
    this.once = false;

    this.keyDown = function(e) {
        // If the ESC key is pressed
        var ESCAPE_KEY = 27;

        if (e.keyCode === ESCAPE_KEY) {
            if (this.lastAjax) {
                this.lastAjax.abort();
                this.lastAjax = null;
            }

            if (this.after) {
                this.after();
            }

            if (this.once) {
                this.removeKeyDown();
            }
        }
    };

    this.onKeyDown = function(after) {
        this.after = after;
        this.once = false;

        this.keyDown = this.keyDown.bind(this);
        document.addEventListener('keydown', this.keyDown);
    };

    this.onceKeyDown = function(after) {
        this.after = after;
        this.once = true;

        this.keyDown = this.keyDown.bind(this);
        document.addEventListener('keydown', this.keyDown);
    };

    this.removeKeyDown = function() {
        this.after = null;
        document.removeEventListener('keydown', this.keyDown);
    };
}
