import { useState } from 'react';
export function cn(...classes){return classes.filter(Boolean).join(' ');}
export function useControllableValue(value,defaultValue,onChange){const [innerValue,setInnerValue]=useState(defaultValue);const currentValue=value!==undefined?value:innerValue;const setValue=(nextValue)=>{if(value===undefined)setInnerValue(nextValue);if(onChange)onChange(nextValue);};return [currentValue,setValue];}
