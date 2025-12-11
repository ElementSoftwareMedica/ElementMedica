var O=Object.defineProperty,A=Object.defineProperties;var B=Object.getOwnPropertyDescriptors;var x=Object.getOwnPropertySymbols;var w=Object.prototype.hasOwnProperty,S=Object.prototype.propertyIsEnumerable;var N=(e,r,t)=>r in e?O(e,r,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[r]=t,C=(e,r)=>{for(var t in r||(r={}))w.call(r,t)&&N(e,t,r[t]);if(x)for(var t of x(r))S.call(r,t)&&N(e,t,r[t]);return e},F=(e,r)=>A(e,B(r));var E=(e,r)=>{var t={};for(var n in e)w.call(e,n)&&r.indexOf(n)<0&&(t[n]=e[n]);if(e!=null&&x)for(var n of x(e))r.indexOf(n)<0&&S.call(e,n)&&(t[n]=e[n]);return t};import{j as s}from"./ui-CGZTu-WY.js";import{r as G}from"./vendor-2dSOjWVe.js";import{D as a}from"./index-DEZ6nUh4.js";const H={default:`
    border border-gray-300 bg-white
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
  `,filled:`
    border border-transparent bg-gray-50
    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white
  `,outline:`
    border-2 border-gray-300 bg-transparent
    focus:border-primary-500 focus:ring-0
  `,flushed:`
    border-0 border-b-2 border-gray-300 bg-transparent rounded-none
    focus:border-primary-500 focus:ring-0
  `},J={sm:"px-3 py-1.5 text-sm min-h-[32px]",md:"px-3 py-2 text-base min-h-[40px]",lg:"px-4 py-3 text-lg min-h-[48px]"},R={default:"",error:"border-red-500 focus:border-red-500 focus:ring-red-500",success:"border-green-500 focus:border-green-500 focus:ring-green-500",disabled:"!bg-gray-50 text-gray-500 cursor-not-allowed"},K=`
  w-full
  rounded-full
  font-medium
  transition-all duration-200
  focus:outline-none
  placeholder:text-gray-400
  disabled:cursor-not-allowed disabled:opacity-50
`,L=`
  block text-sm font-medium text-gray-700 mb-1
`,y=`
  mt-1 text-xs
`,P=G.forwardRef((Q,q)=>{var g=Q,{variant:e="default",size:r="md",state:t="default",label:n,helperText:p,errorMessage:i,successMessage:d,leftIcon:l,rightIcon:c,fullWidth:b=!0,disabled:u,className:$,id:k}=g,o=E(g,["variant","size","state","label","helperText","errorMessage","successMessage","leftIcon","rightIcon","fullWidth","disabled","className","id"]);const f=k||`input-${Math.random().toString(36).substr(2,9)}`,h=i?"error":d?"success":t,z=l||c,m=`${f}-message`,D=i||d||p,I=a(K,H[e],J[r],R[h],u&&R.disabled,o.readOnly&&"!bg-gray-50",z&&"flex items-center",l&&"pl-11",c&&"pr-10",!b&&"w-auto",$),j=()=>s.jsxs("div",{className:"relative",children:[l&&s.jsx("div",{className:"absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none",children:s.jsx("span",{className:"text-gray-400",children:l})}),s.jsx("input",F(C({ref:q,id:f,type:"text",disabled:u,className:I,"aria-describedby":D?m:void 0,"aria-invalid":h==="error"?"true":void 0},o),{onChange:u?void 0:o.onChange,onFocus:u?void 0:o.onFocus})),c&&s.jsx("div",{className:"absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none",children:s.jsx("span",{className:"text-gray-400",children:c})})]}),v=()=>i?s.jsx("p",{id:m,className:a(y,"text-red-600"),children:i}):d?s.jsx("p",{id:m,className:a(y,"text-green-600"),children:d}):p?s.jsx("p",{id:m,className:a(y,"text-gray-500"),children:p}):null;return n?s.jsxs("div",{className:a("w-full",!b&&"w-auto"),children:[s.jsxs("label",{htmlFor:f,className:L,children:[n,o.required&&s.jsx("span",{className:"text-red-500 ml-1",children:"*"})]}),j(),v()]}):s.jsxs("div",{className:a("w-full",!b&&"w-auto"),children:[j(),v()]})});P.displayName="Input";export{P as I};
//# sourceMappingURL=Input-DjmPPVit.js.map
