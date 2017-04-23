function CancellableAjax() {
    this.lastAjax = null;

    this.ajax = function(options, onCancel) {
        this.lastAjax = $.ajax(options);

        this.onceKeyDown(onCancel);
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
