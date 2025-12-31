// This is a FILE named pkg.js (not a directory)
// When both ./pkg/ directory and ./pkg.js file exist,
// import './pkg' should resolve to this file (file takes priority)
export const pkg = 'file';
