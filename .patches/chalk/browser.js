'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* eslint-env browser */

const isBlinkBasedBrowser = true;///\b(Chrome|Chromium)\//.test(navigator.userAgent);

const colorSupport = isBlinkBasedBrowser ? {
	level: 1,
	hasBasic: true,
	has256: false,
	has16m: false,
} : false;

const supportsColor = {
	stdout: colorSupport,
	stderr: colorSupport,
};

exports["default"] = supportsColor;
//# sourceMappingURL=browser.js.map
