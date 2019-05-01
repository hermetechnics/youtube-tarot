chrome.runtime.onInstalled.addListener(function() {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(request);
            if (request.message == "local_img_data") {
                var canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");
                var img = new Image();

                img.addEventListener("load", function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    context.drawImage(img, 0, 0);
                    sendResponse({
                        data: context.getImageData(0, 0, img.width, img.height),
                        width: img.width,
                        height: img.height  
                    }); 
                });

                img.src = request.url;
                return true;
            }
        }
    );
});