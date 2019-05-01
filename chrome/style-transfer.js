// tf.ENV.set('WEBGL_PACK', false);  // This needs to be done otherwise things run very slow v1.0.4

class StyleTransfer {
    constructor(styleImg, styleRatio = 1.0, debug = false) {
        // Initialize images
        this.styleImg = styleImg;
        this.styleRatio = styleRatio;
        this.debug = debug;
    }

    async loadModels() {
        return Promise.all([
            this.loadMobileNetStyleModel(),
            this.loadSeparableTransformerModel(),
        ]).then(([styleNet, transformNet]) => {
            console.log('Loaded models');
            this.styleNet = styleNet;
            this.transformNet = transformNet;
        });
    }

    async loadMobileNetStyleModel() {
        if (!this.mobileStyleNet) {
            this.mobileStyleNet = await tf.loadGraphModel(
                chrome.runtime.getURL('models/style/model.json'));
        }

        return this.mobileStyleNet;
    }

    async loadSeparableTransformerModel() {
        if (!this.separableTransformNet) {
            this.separableTransformNet = await tf.loadGraphModel(
                chrome.runtime.getURL('models/transformer/model.json'));
        }

        return this.separableTransformNet;
    }

    async style(contentImg, targetImg) {
        await tf.nextFrame();
        if (this.debug) console.info('Generating 100D style representation');
        await tf.nextFrame();
        let bottleneck = await tf.tidy(() => {
        return this.styleNet.predict(tf.browser.fromPixels(this.styleImg).toFloat().div(tf.scalar(255)).expandDims());
        })
        if (this.styleRatio !== 1.0) {
            if (this.debug) console.info('Generating 100D identity style representation');
            await tf.nextFrame();
            const identityBottleneck = await tf.tidy(() => {
                return this.styleNet.predict(tf.browser.fromPixels(contentImg).toFloat().div(tf.scalar(255)).expandDims());
            });
            
            const styleBottleneck = bottleneck;
            bottleneck = await tf.tidy(() => {
                const styleBottleneckScaled = styleBottleneck.mul(tf.scalar(this.styleRatio));
                const identityBottleneckScaled = identityBottleneck.mul(tf.scalar(1.0-this.styleRatio));
                return styleBottleneckScaled.addStrict(identityBottleneckScaled)
            })
            styleBottleneck.dispose();
            identityBottleneck.dispose();
        }

        if (this.debug) console.info('Stylizing image...');
        await tf.nextFrame();

        const stylized = await tf.tidy(() => {
            return this.transformNet.predict([tf.browser.fromPixels(contentImg).toFloat().div(tf.scalar(255)).expandDims(), bottleneck]).squeeze();
        });

        await tf.browser.toPixels(stylized, targetImg);
        bottleneck.dispose();  // Might wanna keep this around
        stylized.dispose();
    }
}

window.StyleTransfer = StyleTransfer;