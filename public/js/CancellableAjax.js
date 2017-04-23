function CancellableAjax() {
    this.lastAjax = null;

    this.ajax = function(options) {
        this.lastAjax = $.ajax(options);
    };

    this.after = null;

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
        }
    };

    this.onKeyDown = function(after) {
        this.after = after;

        this.keyDown = this.keyDown.bind(this);
        document.addEventListener('keydown', this.keyDown);
    };

    this.removeKeyDown = function() {
        this.after = null;
        document.removeEventListener('keydown', this.keyDown);
    };
}
