import { INITIAL_PRODUCTS } from '../src/data/mockData.js';
const shoe = INITIAL_PRODUCTS.find(p => p.name === 'Velocity Ultra Running Shoes');
console.log("1. Raw source (mockData.ts):", shoe.price);
