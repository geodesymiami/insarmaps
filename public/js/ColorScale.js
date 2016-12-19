function ColorScale(min, max) {
    var that = this;
    this.levels = 256;

    this.jet = [
        '#000080', '#000084', '#000089', '#00008d', '#000092', '#000096',
        '#00009b', '#00009f', '#0000a4', '#0000a8', '#0000ad', '#0000b2',
        '#0000b6', '#0000bb', '#0000bf', '#0000c4', '#0000c8', '#0000cd',
        '#0000d1', '#0000d6', '#0000da', '#0000df', '#0000e3', '#0000e8',
        '#0000ed', '#0000f1', '#0000f6', '#0000fa', '#0000ff', '#0000ff',
        '#0000ff', '#0000ff', '#0000ff', '#0004ff', '#0008ff', '#000cff',
        '#0010ff', '#0014ff', '#0018ff', '#001cff', '#0020ff', '#0024ff',
        '#0028ff', '#002cff', '#0030ff', '#0034ff', '#0038ff', '#003cff',
        '#0040ff', '#0044ff', '#0048ff', '#004cff', '#0050ff', '#0054ff',
        '#0058ff', '#005cff', '#0060ff', '#0064ff', '#0068ff', '#006cff',
        '#0070ff', '#0074ff', '#0078ff', '#007cff', '#0080ff', '#0084ff',
        '#0088ff', '#008cff', '#0090ff', '#0094ff', '#0098ff', '#009cff',
        '#00a0ff', '#00a4ff', '#00a8ff', '#00acff', '#00b0ff', '#00b4ff',
        '#00b8ff', '#00bcff', '#00c0ff', '#00c4ff', '#00c8ff', '#00ccff',
        '#00d0ff', '#00d4ff', '#00d8ff', '#00dcfe', '#00e0fb', '#00e4f8',
        '#02e8f4', '#06ecf1', '#09f0ee', '#0cf4eb', '#0ff8e7', '#13fce4',
        '#16ffe1', '#19ffde', '#1cffdb', '#1fffd7', '#23ffd4', '#26ffd1',
        '#29ffce', '#2cffca', '#30ffc7', '#33ffc4', '#36ffc1', '#39ffbe',
        '#3cffba', '#40ffb7', '#43ffb4', '#46ffb1', '#49ffad', '#4dffaa',
        '#50ffa7', '#53ffa4', '#56ffa0', '#5aff9d', '#5dff9a', '#60ff97',
        '#63ff94', '#66ff90', '#6aff8d', '#6dff8a', '#70ff87', '#73ff83',
        '#77ff80', '#7aff7d', '#7dff7a', '#80ff77', '#83ff73', '#87ff70',
        '#8aff6d', '#8dff6a', '#90ff66', '#94ff63', '#97ff60', '#9aff5d',
        '#9dff5a', '#a0ff56', '#a4ff53', '#a7ff50', '#aaff4d', '#adff49',
        '#b1ff46', '#b4ff43', '#b7ff40', '#baff3c', '#beff39', '#c1ff36',
        '#c4ff33', '#c7ff30', '#caff2c', '#ceff29', '#d1ff26', '#d4ff23',
        '#d7ff1f', '#dbff1c', '#deff19', '#e1ff16', '#e4ff13', '#e7ff0f',
        '#ebff0c', '#eeff09', '#f1fc06', '#f4f802', '#f8f500', '#fbf100',
        '#feed00', '#ffea00', '#ffe600', '#ffe200', '#ffde00', '#ffdb00',
        '#ffd700', '#ffd300', '#ffd000', '#ffcc00', '#ffc800', '#ffc400',
        '#ffc100', '#ffbd00', '#ffb900', '#ffb600', '#ffb200', '#ffae00',
        '#ffab00', '#ffa700', '#ffa300', '#ff9f00', '#ff9c00', '#ff9800',
        '#ff9400', '#ff9100', '#ff8d00', '#ff8900', '#ff8600', '#ff8200',
        '#ff7e00', '#ff7a00', '#ff7700', '#ff7300', '#ff6f00', '#ff6c00',
        '#ff6800', '#ff6400', '#ff6000', '#ff5d00', '#ff5900', '#ff5500',
        '#ff5200', '#ff4e00', '#ff4a00', '#ff4700', '#ff4300', '#ff3f00',
        '#ff3b00', '#ff3800', '#ff3400', '#ff3000', '#ff2d00', '#ff2900',
        '#ff2500', '#ff2200', '#ff1e00', '#ff1a00', '#ff1600', '#ff1300',
        '#fa0f00', '#f60b00', '#f10800', '#ed0400', '#e80000', '#e40000',
        '#df0000', '#da0000', '#d60000', '#d10000', '#cd0000', '#c80000',
        '#c40000', '#bf0000', '#bb0000', '#b60000', '#b20000', '#ad0000',
        '#a80000', '#a40000', '#9f0000', '#9b0000', '#960000', '#920000',
        '#8d0000', '#890000', '#840000', '#800000'
    ];

    this.zishiCustom = [
        '#0000FF', // blue
        '#00FFFF', // cyan
        '#01DF01', // lime green
        '#FFBF00', // yellow orange
        '#FF0000' // red orange
    ];

    this.jet_r = [
        '#800000', '#840000', '#890000', '#8d0000', '#920000', '#960000',
        '#9b0000', '#9f0000', '#a40000', '#a80000', '#ad0000', '#b20000',
        '#b60000', '#bb0000', '#bf0000', '#c40000', '#c80000', '#cd0000',
        '#d10000', '#d60000', '#da0000', '#df0000', '#e40000', '#e80000',
        '#ed0400', '#f10800', '#f60b00', '#fa0f00', '#ff1300', '#ff1600',
        '#ff1a00', '#ff1e00', '#ff2200', '#ff2500', '#ff2900', '#ff2d00',
        '#ff3000', '#ff3400', '#ff3800', '#ff3b00', '#ff3f00', '#ff4300',
        '#ff4700', '#ff4a00', '#ff4e00', '#ff5200', '#ff5500', '#ff5900',
        '#ff5d00', '#ff6000', '#ff6400', '#ff6800', '#ff6c00', '#ff6f00',
        '#ff7300', '#ff7700', '#ff7a00', '#ff7e00', '#ff8200', '#ff8600',
        '#ff8900', '#ff8d00', '#ff9100', '#ff9400', '#ff9800', '#ff9c00',
        '#ff9f00', '#ffa300', '#ffa700', '#ffab00', '#ffae00', '#ffb200',
        '#ffb600', '#ffb900', '#ffbd00', '#ffc100', '#ffc400', '#ffc800',
        '#ffcc00', '#ffd000', '#ffd300', '#ffd700', '#ffdb00', '#ffde00',
        '#ffe200', '#ffe600', '#ffea00', '#feed00', '#fbf100', '#f8f500',
        '#f4f802', '#f1fc06', '#eeff09', '#ebff0c', '#e7ff0f', '#e4ff13',
        '#e1ff16', '#deff19', '#dbff1c', '#d7ff1f', '#d4ff23', '#d1ff26',
        '#ceff29', '#caff2c', '#c7ff30', '#c4ff33', '#c1ff36', '#beff39',
        '#baff3c', '#b7ff40', '#b4ff43', '#b1ff46', '#adff49', '#aaff4d',
        '#a7ff50', '#a4ff53', '#a0ff56', '#9dff5a', '#9aff5d', '#97ff60',
        '#94ff63', '#90ff66', '#8dff6a', '#8aff6d', '#87ff70', '#83ff73',
        '#80ff77', '#7dff7a', '#7aff7d', '#77ff80', '#73ff83', '#70ff87',
        '#6dff8a', '#6aff8d', '#66ff90', '#63ff94', '#60ff97', '#5dff9a',
        '#5aff9d', '#56ffa0', '#53ffa4', '#50ffa7', '#4dffaa', '#49ffad',
        '#46ffb1', '#43ffb4', '#40ffb7', '#3cffba', '#39ffbe', '#36ffc1',
        '#33ffc4', '#30ffc7', '#2cffca', '#29ffce', '#26ffd1', '#23ffd4',
        '#1fffd7', '#1cffdb', '#19ffde', '#16ffe1', '#13fce4', '#0ff8e7',
        '#0cf4eb', '#09f0ee', '#06edf1', '#02e8f4', '#00e4f8', '#00e0fb',
        '#00dcfe', '#00d8ff', '#00d4ff', '#00d0ff', '#00ccff', '#00c8ff',
        '#00c4ff', '#00c0ff', '#00bcff', '#00b8ff', '#00b4ff', '#00b0ff',
        '#00adff', '#00a8ff', '#00a4ff', '#00a0ff', '#009cff', '#0098ff',
        '#0094ff', '#0090ff', '#008cff', '#0088ff', '#0084ff', '#0080ff',
        '#007dff', '#0078ff', '#0075ff', '#0070ff', '#006dff', '#0068ff',
        '#0065ff', '#0060ff', '#005dff', '#0058ff', '#0055ff', '#0050ff',
        '#004dff', '#0048ff', '#0045ff', '#0040ff', '#003dff', '#0038ff',
        '#0035ff', '#0030ff', '#002dff', '#0028ff', '#0025ff', '#0020ff',
        '#001dff', '#0018ff', '#0015ff', '#0010ff', '#000dff', '#0008ff',
        '#0005ff', '#0000ff', '#0000ff', '#0000ff', '#0000ff', '#0000ff',
        '#0000fa', '#0000f6', '#0000f1', '#0000ed', '#0000e8', '#0000e4',
        '#0000df', '#0000da', '#0000d6', '#0000d1', '#0000cd', '#0000c8',
        '#0000c4', '#0000bf', '#0000bb', '#0000b6', '#0000b2', '#0000ad',
        '#0000a8', '#0000a4', '#00009f', '#00009b', '#000096', '#000092',
        '#00008d', '#000089', '#000084', '#000080'
    ];

    this.hsv = [
        '#ff0000', '#ff0600', '#ff0c00', '#ff1200', '#ff1800', '#ff1e00',
        '#ff2300', '#ff2900', '#ff2f00', '#ff3500', '#ff3b00', '#ff4100',
        '#ff4700', '#ff4d00', '#ff5300', '#ff5900', '#ff5f00', '#ff6400',
        '#ff6a00', '#ff7000', '#ff7600', '#ff7c00', '#ff8200', '#ff8800',
        '#ff8e00', '#ff9400', '#ff9a00', '#ff9f00', '#ffa500', '#ffab00',
        '#ffb100', '#ffb700', '#ffbd00', '#ffc300', '#ffc900', '#ffcf00',
        '#ffd500', '#ffdb00', '#ffe000', '#ffe600', '#ffec00', '#fef100',
        '#fcf500', '#faf900', '#f8fd00', '#f4ff00', '#eeff00', '#e8ff00',
        '#e2ff00', '#ddff00', '#d7ff00', '#d1ff00', '#cbff00', '#c5ff00',
        '#bfff00', '#b9ff00', '#b3ff00', '#adff00', '#a7ff00', '#a2ff00',
        '#9cff00', '#96ff00', '#90ff00', '#8aff00', '#84ff00', '#7eff00',
        '#78ff00', '#72ff00', '#6cff00', '#66ff00', '#61ff00', '#5bff00',
        '#55ff00', '#4fff00', '#49ff00', '#43ff00', '#3dff00', '#37ff00',
        '#31ff00', '#2bff00', '#25ff00', '#20ff00', '#1aff00', '#14ff00',
        '#0eff00', '#08ff00', '#06ff04', '#04ff08', '#02ff0c', '#00ff10',
        '#00ff16', '#00ff1b', '#00ff21', '#00ff27', '#00ff2d', '#00ff33',
        '#00ff39', '#00ff3f', '#00ff45', '#00ff4b', '#00ff51', '#00ff57',
        '#00ff5c', '#00ff62', '#00ff68', '#00ff6e', '#00ff74', '#00ff7a',
        '#00ff80', '#00ff86', '#00ff8c', '#00ff92', '#00ff97', '#00ff9d',
        '#00ffa3', '#00ffa9', '#00ffaf', '#00ffb5', '#00ffbb', '#00ffc1',
        '#00ffc7', '#00ffcd', '#00ffd3', '#00ffd8', '#00ffde', '#00ffe4',
        '#00ffea', '#00fff0', '#00fff6', '#00fffc', '#00fcff', '#00f6ff',
        '#00f0ff', '#00eaff', '#00e5ff', '#00dfff', '#00d9ff', '#00d3ff',
        '#00cdff', '#00c7ff', '#00c1ff', '#00bbff', '#00b5ff', '#00afff',
        '#00aaff', '#00a4ff', '#009eff', '#0098ff', '#0092ff', '#008cff',
        '#0086ff', '#0080ff', '#007aff', '#0074ff', '#006eff', '#0069ff',
        '#0063ff', '#005dff', '#0057ff', '#0051ff', '#004bff', '#0045ff',
        '#003fff', '#0039ff', '#0033ff', '#002dff', '#0028ff', '#0022ff',
        '#001cff', '#0016ff', '#0010ff', '#020cff', '#0408ff', '#0604ff',
        '#0800ff', '#0e00ff', '#1300ff', '#1900ff', '#1f00ff', '#2500ff',
        '#2b00ff', '#3100ff', '#3700ff', '#3d00ff', '#4300ff', '#4900ff',
        '#4f00ff', '#5400ff', '#5a00ff', '#6000ff', '#6600ff', '#6c00ff',
        '#7200ff', '#7800ff', '#7e00ff', '#8400ff', '#8a00ff', '#9000ff',
        '#9500ff', '#9b00ff', '#a100ff', '#a700ff', '#ad00ff', '#b300ff',
        '#b900ff', '#bf00ff', '#c500ff', '#cb00ff', '#d000ff', '#d600ff',
        '#dc00ff', '#e200ff', '#e800ff', '#ee00ff', '#f400ff', '#f800fd',
        '#fa00f9', '#fc00f5', '#fe00f1', '#ff00ed', '#ff00e7', '#ff00e1',
        '#ff00db', '#ff00d5', '#ff00cf', '#ff00c9', '#ff00c3', '#ff00bd',
        '#ff00b7', '#ff00b1', '#ff00ac', '#ff00a6', '#ff00a0', '#ff009a',
        '#ff0094', '#ff008e', '#ff0088', '#ff0082', '#ff007c', '#ff0076',
        '#ff0071', '#ff006b', '#ff0065', '#ff005f', '#ff0059', '#ff0053',
        '#ff004d', '#ff0047', '#ff0041', '#ff003b', '#ff0035', '#ff0030',
        '#ff002a', '#ff0024', '#ff001e', '#ff0018'
    ];

    this.bwr = [
        '#0000ff', '#0202ff', '#0404ff', '#0606ff', '#0808ff', '#0a0aff',
        '#0c0cff', '#0e0eff', '#1010ff', '#1212ff', '#1414ff', '#1616ff',
        '#1818ff', '#1a1aff', '#1c1cff', '#1e1eff', '#2020ff', '#2222ff',
        '#2424ff', '#2626ff', '#2828ff', '#2a2aff', '#2c2cff', '#2e2eff',
        '#3030ff', '#3232ff', '#3434ff', '#3636ff', '#3838ff', '#3a3aff',
        '#3c3cff', '#3e3eff', '#4040ff', '#4242ff', '#4444ff', '#4646ff',
        '#4848ff', '#4a4aff', '#4c4cff', '#4e4eff', '#5050ff', '#5252ff',
        '#5454ff', '#5656ff', '#5858ff', '#5a5aff', '#5c5cff', '#5e5eff',
        '#6060ff', '#6262ff', '#6464ff', '#6666ff', '#6868ff', '#6a6aff',
        '#6c6cff', '#6e6eff', '#7070ff', '#7272ff', '#7474ff', '#7676ff',
        '#7878ff', '#7a7aff', '#7c7cff', '#7e7eff', '#8080ff', '#8282ff',
        '#8484ff', '#8686ff', '#8888ff', '#8a8aff', '#8c8cff', '#8e8eff',
        '#9090ff', '#9292ff', '#9494ff', '#9696ff', '#9898ff', '#9a9aff',
        '#9c9cff', '#9e9eff', '#a0a0ff', '#a2a2ff', '#a4a4ff', '#a6a6ff',
        '#a8a8ff', '#aaaaff', '#acacff', '#aeaeff', '#b0b0ff', '#b2b2ff',
        '#b4b4ff', '#b6b6ff', '#b8b8ff', '#babaff', '#bcbcff', '#bebeff',
        '#c0c0ff', '#c2c2ff', '#c4c4ff', '#c6c6ff', '#c8c8ff', '#cacaff',
        '#ccccff', '#ceceff', '#d0d0ff', '#d2d2ff', '#d4d4ff', '#d6d6ff',
        '#d8d8ff', '#dadaff', '#dcdcff', '#dedeff', '#e0e0ff', '#e2e2ff',
        '#e4e4ff', '#e6e6ff', '#e8e8ff', '#eaeaff', '#ececff', '#eeeeff',
        '#f0f0ff', '#f2f2ff', '#f4f4ff', '#f6f6ff', '#f8f8ff', '#fafaff',
        '#fcfcff', '#fefeff', '#fffefe', '#fffcfc', '#fffafa', '#fff8f8',
        '#fff6f6', '#fff4f4', '#fff2f2', '#fff0f0', '#ffeeee', '#ffecec',
        '#ffeaea', '#ffe8e8', '#ffe6e6', '#ffe4e4', '#ffe2e2', '#ffe0e0',
        '#ffdede', '#ffdcdc', '#ffdada', '#ffd8d8', '#ffd6d6', '#ffd4d4',
        '#ffd2d2', '#ffd0d0', '#ffcece', '#ffcccc', '#ffcaca', '#ffc8c8',
        '#ffc6c6', '#ffc4c4', '#ffc2c2', '#ffc0c0', '#ffbebe', '#ffbcbc',
        '#ffbaba', '#ffb8b8', '#ffb6b6', '#ffb4b4', '#ffb2b2', '#ffb0b0',
        '#ffaeae', '#ffacac', '#ffaaaa', '#ffa8a8', '#ffa6a6', '#ffa4a4',
        '#ffa2a2', '#ffa0a0', '#ff9e9e', '#ff9c9c', '#ff9a9a', '#ff9898',
        '#ff9696', '#ff9494', '#ff9292', '#ff9090', '#ff8e8e', '#ff8c8c',
        '#ff8a8a', '#ff8888', '#ff8686', '#ff8484', '#ff8282', '#ff8080',
        '#ff7e7e', '#ff7c7c', '#ff7a7a', '#ff7878', '#ff7676', '#ff7474',
        '#ff7272', '#ff7070', '#ff6e6e', '#ff6c6c', '#ff6a6a', '#ff6868',
        '#ff6666', '#ff6464', '#ff6262', '#ff6060', '#ff5e5e', '#ff5c5c',
        '#ff5a5a', '#ff5858', '#ff5656', '#ff5454', '#ff5252', '#ff5050',
        '#ff4e4e', '#ff4c4c', '#ff4a4a', '#ff4848', '#ff4646', '#ff4444',
        '#ff4242', '#ff4040', '#ff3e3e', '#ff3c3c', '#ff3a3a', '#ff3838',
        '#ff3636', '#ff3434', '#ff3232', '#ff3030', '#ff2e2e', '#ff2c2c',
        '#ff2a2a', '#ff2828', '#ff2626', '#ff2424', '#ff2222', '#ff2020',
        '#ff1e1e', '#ff1c1c', '#ff1a1a', '#ff1818', '#ff1616', '#ff1414',
        '#ff1212', '#ff1010', '#ff0e0e', '#ff0c0c', '#ff0a0a', '#ff0808',
        '#ff0606', '#ff0404', '#ff0202', '#ff0000',
    ];

    this.currentScale = this.jet;

    // in cm
    this.min = min;
    this.max = max;

    this.setScale = function(scale) {
        if (scale == "jet") {
            that.currentScale = that.jet;
        } else if (scale == "zishiCustom") {
            that.currentScale = that.zishiCustom;
        } else if (scale == "jet_r") {
            that.currentScale = that.jet_r;
        } else if (scale == "hsv") {
            that.currentScale = that.hsv;
        } else if (scale == "bwr") {
            that.currentScale = that.bwr;
        } else {
            throw "Invalid Color Scale (" + scale + ") selected";
        }
    };

    this.colorsToMapboxStops = function(min, max, colors) {
        var stops = [];

        // we divide by 100 because this class works in cm, but mapbox works in m as
        // those are the units in the original h5 files
        var colorRange = (Math.abs(min) + Math.abs(max)) / 100;
        var currentValue = min / 100;

        var increment = colorRange / colors.length;

        for (var i = 0; i < colors.length; i++) {
            var curStop = [currentValue, colors[i]];
            stops.push(curStop);
            currentValue += increment;
        }

        return stops;
    };

    this.initVisualScale = function() {
        $("#min-scale-value").val(that.min);
        $("#max-scale-value").val(that.max);
    };

    this.setMin = function(min) {
        that.min = min;
        $("#min-scale-value").val(that.min);
    };

    this.setMax = function(max) {
        that.max = max;
        $("#max-scale-value").val(that.max);
    };

    this.setMinMax = function(min, max) {
        that.setMin(min);
        that.setMax(max);
    };

    this.defaultValues = function() {
        that.setScale("jet");
        that.setMinMax(-2.0, 2.0);
    };

    this.getMapboxStops = function() {
        return that.colorsToMapboxStops(that.min, that.max, this.currentScale);
    };
}
