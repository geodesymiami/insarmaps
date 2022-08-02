function CancellableAjax() {
    this.lastAjax = null;

    // make success and callback take out keypress listener...
    this.prepareSuccessAndErrorCallbacks = function(options) {
        // use that. im scared of binding this and any possible repercussions since
        // the oncancel might be bound to the this of another scope...
        var that = this;
        if (options.success) {
            var oldCallback = options.success;
            options.success = function(response) {
                oldCallback(response);
                that.removeKeyDown();
            }
        }

        if (options.error) {
            // using same variable or same variable name leads as oldCallback leads to ajax error ing
            // out and the error callback being called. must be a stupid js naming rule i'm forgetting
            var oldCallback2 = options.error;
            options.error = function(response) {
                oldCallback2(response);
                // error callback is called if we cancel the ajax. so, only remove the keyDown handler
                // if this.after is not null. this assures we don't remove the keyDown handler if error callback
                // is pressed due to cancelling the ajax (but only if there was any other sort of error).
                if (this.after) {
                    that.removeKeyDown();
                }
            }
        }

        return options;
    };

    this.ajax = function(options, onCancel) {
        // remove key listener on success or on error not just on key press
        if (onCancel) {
            options = this.prepareSuccessAndErrorCallbacks(options);
        }
        this.lastAjax = $.ajax(options);

        this.onceKeyDown(onCancel);
    };

    this.xmlHTTPRequestAjax = function(options, onCancel) {
        var xhr = new XMLHttpRequest();

        options = this.prepareSuccessAndErrorCallbacks(options);
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

    this.cancel = function() {
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
    };

    this.keyDown = function(e) {
        // If the ESC key is pressed
        var ESCAPE_KEY = 27;

        if (e.keyCode === ESCAPE_KEY) {
            this.cancel();
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

