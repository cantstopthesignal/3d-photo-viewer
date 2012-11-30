/**
Copyright (c) 2011, NVIDIA Corporation
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
•   Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
•   Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
•   Neither the name of the NVIDIA Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED 
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

function NvStereoUtils() {
    
    /**** Private helper functions. ****/
    // Plugin detection in mozilla. Go through all registered plugin and find ours
    function detectPluginMoz(toFind) {
        // Not found yet
        var present = false;
        // Check plugin array
        if (navigator.plugins && navigator.plugins.length > 0) {
            for (counter=0; counter<navigator.plugins.length; counter++) {
                if (navigator.plugins[counter].name.indexOf(toFind) >= 0)
                {
                    return true;
                }
            }
        }
    }

    // Plugin Detection in IE. Attempt to load an ActiveXObject of our plugin type. 
    // If no error is thrown, we know we are ok and our plugin is loaded.
    function detectPluginActiveX(toFind) {
        if (window.ActiveXObject) {
            var obj = null;
            try {
                obj = new ActiveXObject(toFind);
            } catch (e) {
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    // Call IE and Mozilla procedures with their respective string values to find if plugin
    // exists on given browser
    function detectPlugin(toFindIE, toFindMoz) {
        if (detectPluginMoz(toFindMoz)) {
            return true;
        }
        else if (detectPluginActiveX(toFindIE)) {
            return true;
        }
        else {
            return false;
        }
    }

    /*** Constructor ***/
    var isPluginPresent = false;
    var isFF4HTML5 = false;
    // We make a private that variable. This is used to make the object available to the private methods.
    var that = this;
    // image var
    var image = null;
    // Video var
    var vid = null;

    isPluginPresent = detectPlugin('Nv3DVisionIePlugin.Nv3DVisionControl.1', 'NVIDIA 3D Vision');

    if (isPluginPresent) {
        if (navigator.appName == 'Microsoft Internet Explorer')
        {
            // IE doesn't like embed creation followed by JS calls. Create activeX object directly
            image = new ActiveXObject('Nv3DVisionIePlugin.Nv3DVisionControl.1');
        } else {
            // FF and Chrome.
            var embed = document.createElement('embed');
            embed.setAttribute('id', 'NvImageDetectionFFID');
            embed.setAttribute('style', "visibility: hidden");
            embed.setAttribute('width', 25);
            embed.setAttribute('height', 25);
            embed.setAttribute('type', "image/jps");
            document.body.appendChild(embed);
            image = document.getElementById("NvImageDetectionFFID");

            if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)) { //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
                var ffversion = new Number(RegExp.$1); // capture x.x portion and store as a number

                if (ffversion>=4)
                    isFF4HTML5 = true;
            }
        }
    }

    /*** Privileged functions. ***/
    this.NvGetDriverVersion = function() {
        try {
            if (isPluginPresent && (image != null)) {
                return image.NvGetDriverVersion();
            }
        } catch (e) {}
        return 0;
    }

    this.NvIsDriverPresent = function() {
        return isPluginPresent;
    }

    this.NvIsStereoCapable = function() {
        try {
            if (isPluginPresent && (image != null)) {
                return (image.NvIsStereoCapable() == "1");
            }
        } catch (e) {}
        return false;
    }

    this.NvIsStereoEnabled = function() {
        try {
            if (isPluginPresent && (image != null)) {
                return (image.NvIsStereoEnabled() == "1");
            }
        } catch (e) {}
        return false;
    }

}

