(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[718],{6774:function(e,t,n){(window.__NEXT_P=window.__NEXT_P||[]).push(["/cameras",function(){return n(2267)}])},2267:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return O}});var s=n(5893),i=n(7294),o=n(9008),r=n.n(o),a=n(7522),l=n(5124),c=n(5961),d=n(4987),u=n(1664),h=n.n(u),m=n(5544),x=n(3160),g=n.n(x),f=n(6345),j=n(1196),v=n(8209);function p(e,t){if(void 0===t.IPDwarf)return;let n=new WebSocket((0,m.nN)(t.IPDwarf));n.addEventListener("open",()=>{let s=t.astroSettings.binning?t.astroSettings.binning:m.KU,i=(0,m.U1)(s,e);(0,f.k)("start turnOnCamera...",i,t),(0,m.eh)(n,i)}),n.addEventListener("message",e=>{let n=JSON.parse(e.data);n.interface===m.Gu?(0,f.k)("turnOnCamera:",n,t):(0,f.k)("",n,t)}),n.addEventListener("error",e=>{(0,f.k)("turnOnCamera error:",e,t)})}function b(e,t,n){if(void 0===n.IPDwarf)return;let s=new WebSocket((0,m.nN)(n.IPDwarf)),i=m.Of,o=[m.xK,m.cY,m.vu,m.J2,m.w8];s.addEventListener("open",()=>{let o={};"exposure"===e?(o=(0,m.aO)(i,t),(0,m.eh)(s,o)):"exposureMode"===e?(o=(0,m.AV)(i,t),(0,m.eh)(s,o)):"gain"===e?(o=(0,m.v)(i,t),(0,m.eh)(s,o)):"gainMode"===e?(o=(0,m.ln)(i,t),(0,m.eh)(s,o)):"IR"===e&&(o=(0,m.Lk)(t),(0,m.eh)(s,o)),(0,f.k)("start set ".concat(e,"..."),o,n)}),s.addEventListener("message",t=>{let s=JSON.parse(t.data);o.includes(s.interface)?(0,f.k)("set ".concat(e,":"),s,n):(0,f.k)("",s,n)}),s.addEventListener("error",t=>{(0,f.k)("set ".concat(e," error:"),t,n)})}function N(e){let{showWideangle:t}=e,n=(0,i.useContext)(a.hg);(0,i.useEffect)(()=>{!function(e){if(void 0===n.IPDwarf)return;let t=new WebSocket((0,m.nN)(n.IPDwarf));t.addEventListener("open",()=>{let s=(0,m.DI)(e);(0,f.k)("start cameraWorkingState...",s,n),(0,m.eh)(t,s)}),t.addEventListener("message",t=>{let s=JSON.parse(t.data);if(s.interface===m.Tu){let t=0===e?"telephoto":"wideangle";1===s.camState?(0,f.k)(t+" open",{},n):((0,f.k)(t+" closed",{},n),0===e?r("off"):c("off"))}}),t.addEventListener("error",e=>{(0,f.k)("cameraWorkingState error:",e,n)})}(m.Of)},[]);let[o,r]=(0,i.useState)("off"),[l,c]=(0,i.useState)("off"),d=n.IPDwarf||m.Bq;function u(e){e===m.Of?(p(m.Of,n),r("on")):(p(m.s8,n),c("on"))}return(0,s.jsxs)("div",{className:g().section,children:["off"===l&&(0,s.jsx)("div",{className:"py-2 clearfix",children:(0,s.jsxs)("div",{className:"float-end",children:[(0,s.jsx)("button",{className:"btn btn-primary",onClick:()=>u(m.s8),children:"Turn on wideangle camera"}),(0,s.jsx)("br",{}),(0,s.jsx)(h(),{href:(0,m.K2)(d),children:(0,m.K2)(d)})]})}),"off"===o&&(0,s.jsx)("div",{className:"py-2",children:(0,s.jsxs)("div",{className:"float-end",children:[(0,s.jsx)("button",{className:"btn btn-primary",onClick:()=>u(m.Of),children:"Turn on telephoto camera"}),(0,s.jsx)("br",{}),(0,s.jsx)(h(),{href:(0,m.Jj)(d),children:(0,m.Jj)(d)})]})}),(0,s.jsx)("div",{className:"".concat(t?"":"d-none"),children:(0,s.jsx)("img",{onLoad:()=>c("on"),src:(0,m.K2)(d),alt:"livestream for wideangle camera",className:g().wideangle})}),(0,s.jsx)("div",{children:(0,s.jsx)("img",{onLoad:()=>r("on"),src:(0,m.Jj)(d),alt:"livestream for telephoto camera",className:g().telephoto})})]})}var S=n(6080),k=n(755),w=n(3489),C=n(2580),I=n(2526);function L(e){let t={};return["gain","exposure","IR","binning","fileFormat","count"].forEach(n=>{(void 0===e[n]||"default"===e[n])&&(t[n]="".concat(n," is required"))}),t}var y=n(9309),_=n.n(y);function A(e){let{onClick:t}=e;return(0,s.jsxs)("div",{className:_().settings,children:[(0,s.jsxs)("div",{className:"fs-5 mb-2",role:"button",onClick:t,children:[(0,s.jsx)("i",{className:"bi bi-arrow-left-circle"})," Back"]}),(0,s.jsxs)("dl",{children:[(0,s.jsx)("dt",{children:"Gain"}),(0,s.jsx)("dd",{children:"Gain is a digital camera setting that controls the amplification of the signal from the camera sensor. It should be noted that this amplifies the whole signal, including any associated background noise."}),(0,s.jsx)("dt",{children:"Exposure"}),(0,s.jsx)("dd",{children:"Time during which the sensor will be exposed to light and capturing information (energy)."}),(0,s.jsx)("dt",{children:"IR (infrared) - Pass"}),(0,s.jsx)("dd",{children:"Allows the infrared wavelength to reach the sensor. Several astronomical objects emit in this wavelength."}),(0,s.jsx)("dt",{children:"IR (infrared) - Cut"}),(0,s.jsx)("dd",{children:"Blocks infrared wavelength. Useful for lunar and planetary."}),(0,s.jsx)("dt",{children:"Binning - 1x1"}),(0,s.jsx)("dd",{children:"Camera captures light on each individual physical pixel."}),(0,s.jsx)("dt",{children:"Binning - 2x2"}),(0,s.jsx)("dd",{children:'Camera combines physical pixels in groups of 2x2 (4 pixels) and considers all light captured in the group as a single pixel. Can be considered a "virtual" pixel. This makes pixel size larger and reduces resolution by a factor equal to the binning.'}),(0,s.jsx)("dt",{children:"Format - FITS"}),(0,s.jsx)("dd",{children:"Astronomy lossless numerical file format. Can include meta data of the image (coordinates, camera, pixel size binning, filter, etc) that can be used by processing software."}),(0,s.jsx)("dt",{children:"Format - TIFF"}),(0,s.jsx)("dd",{children:"A lossless file format, but not especifically oriented towards astronomy."}),(0,s.jsx)("dt",{children:"Count"}),(0,s.jsx)("dd",{children:"Number of images to take"})]})]})}function F(e){let{setValidSettings:t,setShowSettingsMenu:n}=e,o=(0,i.useContext)(a.hg),[r,l]=(0,i.useState)(!1);function c(e){o.setAstroSettings(t=>(delete t[e],"gain"===e&&delete t.gainMode,"exposure"===e&&delete t.exposureMode,{...t})),(0,I.nV)(e,void 0),"gain"===e&&(0,I.nV)("gainMode",void 0),"exposure"===e&&(0,I.nV)("exposureMode",void 0)}function d(){l(!r)}let u=[.01,.1,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],h=(0,v.w6)(30,150,10);return r?(0,s.jsx)(A,{onClick:d}):(0,s.jsx)("div",{children:(0,s.jsx)(C.J9,{initialValues:{gain:o.astroSettings.gain,exposure:o.astroSettings.exposure,IR:o.astroSettings.IR,binning:o.astroSettings.binning,fileFormat:o.astroSettings.fileFormat,count:o.astroSettings.count||0,rightAcension:o.astroSettings.rightAcension,declination:o.astroSettings.declination},validate:e=>{let n=L(e);return 0===Object.keys(n).length?t(!0):t(!1),n},onSubmit:()=>{},children:e=>{let{values:t,errors:i,handleChange:r,handleBlur:a,handleSubmit:l}=e;return(0,s.jsxs)("form",{onSubmit:l,children:[(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsxs)("div",{className:"fs-5 mb-2",children:["Camera Settings"," ",(0,s.jsx)("i",{className:"bi bi-info-circle",role:"button",onClick:d})]}),(0,s.jsx)("div",{className:"col-4",children:(0,s.jsx)("label",{htmlFor:"gain",className:"form-label",children:"Gain"})}),(0,s.jsx)("div",{className:"col-8",children:(0,s.jsxs)("select",{name:"gain",onChange:e=>{r(e),function(e){let t,n,s=e.target.value;if("default"===s){c("gain");return}"auto"===s?(n=m.bI,t=0):(n=m.SD,t=Number(s)),o.setAstroSettings(e=>(e.gainMode=n,{...e})),(0,I.nV)("gainMode",n.toString()),b("gainMode",n,o),setTimeout(()=>{o.setAstroSettings(e=>("auto"===s?e.gain=s:e.gain=t,{...e})),(0,I.nV)("gain",s),b("gain",t,o)},1e3)}(e)},onBlur:a,value:t.gain,children:[(0,s.jsx)("option",{value:"default",children:"Select"}),(0,s.jsx)("option",{value:"auto",children:"Auto"}),h.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})})]}),(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsx)("div",{className:"col-4",children:(0,s.jsx)("label",{htmlFor:"exposure",className:"form-label",children:"Exposure"})}),(0,s.jsx)("div",{className:"col-8",children:(0,s.jsxs)("select",{name:"exposure",onChange:e=>{r(e),function(e){let t,n,s=e.target.value;if("default"===s){c("exposure");return}"auto"===s?(n=m.EI,t=0):(n=m.SD,t=Number(s)),o.setAstroSettings(e=>(e.exposureMode=n,{...e})),(0,I.nV)("exposureMode",n.toString()),b("exposureMode",n,o),setTimeout(()=>{o.setAstroSettings(e=>("auto"===s?e.exposure=s:e.exposure=t,{...e})),(0,I.nV)("exposure",s),b("exposure",t,o)},500)}(e)},onBlur:a,value:t.exposure,children:[(0,s.jsx)("option",{value:"default",children:"Select"}),(0,s.jsx)("option",{value:"auto",children:"Auto"}),u.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})})]}),(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsx)("div",{className:"col-4",children:(0,s.jsx)("label",{htmlFor:"ir",className:"form-label",children:"IR"})}),(0,s.jsx)("div",{className:"col-8",children:(0,s.jsxs)("select",{name:"IR",onChange:e=>{r(e),function(e){if("default"===e.target.value){c("IR");return}let t=Number(e.target.value);o.setAstroSettings(e=>(e.IR=t,{...e})),(0,I.nV)("IR",e.target.value),b("IR",t,o)}(e)},onBlur:a,value:t.IR,children:[(0,s.jsx)("option",{value:"default",children:"Select"}),(0,s.jsx)("option",{value:"0",children:"Cut"}),(0,s.jsx)("option",{value:"3",children:"Pass"})]})})]}),(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsx)("div",{className:"col-4",children:(0,s.jsx)("label",{htmlFor:"binning",className:"form-label",children:"Binning"})}),(0,s.jsx)("div",{className:"col-8",children:(0,s.jsxs)("select",{name:"binning",onChange:e=>{r(e),function(e){if("default"===e.target.value){c("binning");return}let t=Number(e.target.value);o.setAstroSettings(e=>(e.binning=t,{...e})),(0,I.nV)("binning",e.target.value)}(e)},onBlur:a,value:t.binning,children:[(0,s.jsx)("option",{value:"default",children:"Select"}),(0,s.jsx)("option",{value:"0",children:"1x1"}),(0,s.jsx)("option",{value:"1",children:"2x2"})]})})]}),(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsx)("div",{className:"col-4",children:(0,s.jsx)("label",{htmlFor:"fileFormat",className:"form-label",children:"Format"})}),(0,s.jsx)("div",{className:"col-8",children:(0,s.jsxs)("select",{name:"fileFormat",onChange:e=>{r(e),function(e){if("default"===e.target.value){c("fileFormat");return}let t=Number(e.target.value);o.setAstroSettings(e=>(e.fileFormat=t,{...e})),(0,I.nV)("fileFormat",e.target.value)}(e)},onBlur:a,value:t.fileFormat,children:[(0,s.jsx)("option",{value:"default",children:"Select"}),(0,s.jsx)("option",{value:"0",children:"FITS"}),(0,s.jsx)("option",{value:"1",children:"TIFF"})]})})]}),(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsx)("div",{className:"col-4",children:(0,s.jsx)("label",{htmlFor:"count",className:"form-label",children:"Count"})}),(0,s.jsx)("div",{className:"col-8",children:(0,s.jsx)("input",{type:"number",className:"form-control",name:"count",placeholder:"1",min:"1",onChange:e=>{r(e),function(e){if(1>Number(e.target.value)){c("fileFormat");return}let t=Number(e.target.value);o.setAstroSettings(e=>(e.count=t,{...e})),(0,I.nV)("count",e.target.value)}(e)},onBlur:a,value:t.count})}),i.count&&(0,s.jsx)("p",{className:"text-danger",children:i.count})]}),(0,s.jsxs)("div",{className:"row mb-md-2 mb-sm-1",children:[(0,s.jsx)("div",{className:"col-4",children:"Total time"}),(0,s.jsx)("div",{className:"col-8",children:function(e,t){if("string"==typeof t)return;let n=(0,j.tS)(e,t);if(n)return n.hours?"".concat(n.hours,"h ").concat(n.minutes,"m ").concat(n.seconds,"s"):n.minutes?"".concat(n.minutes,"m ").concat(n.seconds,"s"):"".concat(n.seconds,"s")}(o.astroSettings.count,o.astroSettings.exposure)})]}),(0,s.jsx)("button",{onClick:()=>n(!1),className:"btn btn-outline-primary",children:"Close"})]})}})})}var E=n(1237),T=n.n(E);function P(e){let{onClick:t}=e;return(0,s.jsxs)("svg",{onClick:t,className:T().icon,height:"100%",version:"1.1",viewBox:"0 0 64 64",width:"100%",xmlns:"http://www.w3.org/2000/svg",children:[(0,s.jsxs)("g",{className:T().outerring,children:[(0,s.jsx)("path",{d:"M2 32C2 15.4317 15.4317 2 32 2C48.5683 2 62 15.4317 62 32C62 48.5683 48.5683 62 32 62C15.4317 62 2 48.5683 2 32Z",fill:"none",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"4"}),(0,s.jsx)("path",{d:"M32 2L32 32",fill:"currentColor",fillRule:"nonzero",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"4"})]}),(0,s.jsx)("path",{d:"M21 21L43 21L43 43L21 43L21 21Z",fill:"currentColor",fillRule:"nonzero",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"2"})]})}function M(e){var t;let n;let{onClick:i,className:o}=e;return(0,s.jsxs)("svg",{onClick:i,className:(t=T(),n=[],["icon",o].filter(e=>void 0!==e).forEach(e=>{t[e]&&n.push(t[e])}),n.join(", ")),height:"100%",version:"1.1",viewBox:"0 0 64 64",width:"100%",xmlns:"http://www.w3.org/2000/svg",children:[(0,s.jsx)("path",{d:"M2 32C2 15.4317 15.4317 2 32 2C48.5683 2 62 15.4317 62 32C62 48.5683 48.5683 62 32 62C15.4317 62 2 48.5683 2 32Z",fill:"none",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"4"}),(0,s.jsx)("path",{d:"M21 32C21 25.9249 25.9249 21 32 21C38.0751 21 43 25.9249 43 32C43 38.0751 38.0751 43 32 43C25.9249 43 21 38.0751 21 32Z",fill:"currentColor",fillRule:"nonzero",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"2"})]})}var R=n(3617),D=n.n(R);function B(e){let{setShowWideangle:t}=e,n=(0,i.useContext)(a.hg),[o,r]=(0,i.useState)(!1),[l,c]=(0,i.useState)(0===Object.keys(L(n.astroSettings)).length&&Object.keys(n.astroSettings).length>0),[d,u]=(0,i.useState)(!1),[x,g]=(0,i.useState)();function N(){clearInterval(x),g(void 0),u(!1)}let C=e=>o?(0,s.jsx)(s.Fragment,{}):(0,s.jsx)(w.Z,{id:"button-tooltip",...e,children:"You must set the camera settings."});return(0,s.jsxs)("ul",{className:"nav nav-pills flex-column mb-auto border",children:[(0,s.jsx)("li",{className:"nav-item ".concat(D().box),children:(0,s.jsx)(h(),{href:"#",className:"",children:"Astro"})}),(0,s.jsx)("li",{className:"nav-item ".concat(D().box),children:(0,s.jsx)(h(),{href:"#",className:"",children:(0,s.jsx)(S.Z,{trigger:"click",placement:"left",show:o,onToggle:()=>r(e=>!e),overlay:(0,s.jsx)(k.Z,{id:"popover-positioned-left",children:(0,s.jsx)(k.Z.Body,{children:(0,s.jsx)(F,{setValidSettings:c,validSettings:l,setShowSettingsMenu:r})})}),children:(0,s.jsx)("i",{className:"bi bi-sliders",style:{fontSize:"1.75rem"}})})})}),(0,s.jsx)("li",{className:"nav-item ".concat(D().box),children:(0,s.jsx)(h(),{href:"#",className:"",children:o?(0,s.jsx)(M,{}):l?d?(0,s.jsx)(P,{onClick:function(){if(void 0===n.IPDwarf)return;N();let e=new WebSocket((0,m.nN)(n.IPDwarf));e.addEventListener("open",()=>{let t=(0,m.T)();(0,f.k)("begin stopAstroPhoto...",t,n),(0,m.eh)(e,t)}),e.addEventListener("message",e=>{let t=JSON.parse(e.data);t.interface===m.Gv?(0,f.k)("stopAstroPhoto",t,n):(0,f.k)("",t,n)}),e.addEventListener("error",e=>{(0,f.k)("stopAstroPhoto error:",e,n)})}}):(0,s.jsx)(M,{onClick:function(){if(void 0==n.IPDwarf||!1===l)return;x||g(setInterval(()=>{let e=function(e){let t=(0,j.Eu)(e.imagingSession.startTime,Date.now());if(t)return"".concat((0,v.vX)(t.hours),":").concat((0,v.vX)(t.minutes),":").concat((0,v.vX)(t.seconds))}(n);e&&n.setImagingSession(t=>(t.sessionElaspsedTime=e,{...t}))},2e3));let e=Date.now();n.setImagingSession(t=>(t.startTime=e,{...t})),u(!0),(0,I.mo)("startTime",e.toString());let t=new WebSocket((0,m.nN)(n.IPDwarf));t.addEventListener("open",()=>{let e=(0,m.jW)(n.astroSettings.rightAcension,n.astroSettings.declination,n.astroSettings.exposure,n.astroSettings.gain,n.astroSettings.binning,n.astroSettings.count,n.astroSettings.fileFormat);(0,f.k)("start takeAstroPhoto...",e,n),(0,m.eh)(t,e)}),t.addEventListener("message",e=>{let t=JSON.parse(e.data);t.interface===m.gM?(0,f.k)("takeAstroPhoto:",t,n):t.interface===m.cG?((0,f.k)("takeAstroPhoto count:",t,n),n.setImagingSession(e=>(e.imagesTaken=t.currentCount,{...e})),(0,I.mo)("imagesTaken",t.currentCount.toString()),t.currentCount===n.astroSettings.count&&N()):(0,f.k)("",t,n)}),t.addEventListener("error",e=>{(0,f.k)("takeAstroPhoto error:",e,n)})}}):(0,s.jsx)(s.Fragment,{children:(0,s.jsx)(S.Z,{placement:"left",delay:{show:100,hide:200},overlay:C,children:(0,s.jsxs)("svg",{height:"100%",version:"1.1",viewBox:"0 0 64 64",width:"100%",xmlns:"http://www.w3.org/2000/svg",children:[(0,s.jsx)("path",{d:"M2 32C2 15.4317 15.4317 2 32 2C48.5683 2 62 15.4317 62 32C62 48.5683 48.5683 62 32 62C15.4317 62 2 48.5683 2 32Z",fill:"none",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"4"}),(0,s.jsx)("path",{d:"M21 32C21 25.9249 25.9249 21 32 21C38.0751 21 43 25.9249 43 32C43 38.0751 38.0751 43 32 43C25.9249 43 21 38.0751 21 32Z",fill:"currentColor",fillRule:"nonzero",opacity:"1",stroke:"currentColor",strokeLinecap:"butt",strokeLinejoin:"round",strokeWidth:"2"})]})})})})}),(0,s.jsx)("li",{className:"nav-item ".concat(D().box),children:(0,s.jsx)(h(),{href:"#",className:"",onClick:()=>t(e=>!e),children:(0,s.jsx)("i",{className:"bi bi-pip",style:{fontSize:"1.75rem",transform:"rotate(180deg)",display:"inline-block"}})})}),!d&&n.imagingSession.startTime&&(0,s.jsx)("li",{className:"nav-item ".concat(D().box),children:(0,s.jsx)(h(),{href:"#",className:"",onClick:function(){n.setImagingSession({}),(0,I.Nj)(),setTimeout(()=>{p(m.Of,n)},1e3),setTimeout(()=>{b("gainMode",n.astroSettings.gainMode,n)},1500),setTimeout(()=>{b("exposureMode",n.astroSettings.exposureMode,n)},2e3),setTimeout(()=>{b("gain",n.astroSettings.gain,n)},2500),setTimeout(()=>{b("exposure",n.astroSettings.exposure,n)},3e3),setTimeout(()=>{b("IR",n.astroSettings.IR,n)},3500)},children:"Live"})})]})}function O(){(0,l.s)(),(0,c.i)();let e=(0,i.useContext)(a.hg),[t,n]=(0,i.useState)(!0),o=void 0===e.connectionStatus||!1===e.connectionStatus,u=void 0===e.latitude||void 0===e.longitude;return o||u?(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(r(),{children:(0,s.jsx)("title",{children:"Astro Photos"})}),(0,s.jsx)(d.Z,{}),(0,s.jsx)("h1",{children:"Astro Photos"}),o&&(0,s.jsx)("p",{className:"text-danger",children:"You must connect to Dwarf II."}),u&&(0,s.jsx)("p",{className:"text-danger",children:"You must set your location."})]}):(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(r(),{children:(0,s.jsx)("title",{children:"Astro Photos"})}),(0,s.jsx)(d.Z,{}),(0,s.jsx)("div",{className:"container",children:(0,s.jsxs)("div",{className:"row px-0",children:[(0,s.jsx)("main",{className:"col",children:(0,s.jsx)(N,{showWideangle:t})}),(0,s.jsx)("div",{style:{width:"60px"},className:"px-0",children:(0,s.jsx)(B,{setShowWideangle:n})})]})})]})}},3160:function(e){e.exports={telephoto:"DwarfCameras_telephoto__p0vkb",wideangle:"DwarfCameras_wideangle__aP5tD",section:"DwarfCameras_section__9nRHP"}},1237:function(e){e.exports={icon:"RecordButton_icon__vIBrq",outerring:"RecordButton_outerring__sJ3Qo",rotate:"RecordButton_rotate__VEQ65"}},9309:function(e){e.exports={settings:"AstroSettingsInfo_settings__7ZwC2"}},3617:function(e){e.exports={box:"ImagingMenu_box__fi8Z0"}}},function(e){e.O(0,[544,898,300,782,774,888,179],function(){return e(e.s=6774)}),_N_E=e.O()}]);