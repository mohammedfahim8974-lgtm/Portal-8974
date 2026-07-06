const h = 11;
const ot = 0;
const standardHours = 10;
const calcOt = ot > 0 || (h <= standardHours) ? ot : Math.max(0, h - standardHours);
console.log("calcOt: ", calcOt);
