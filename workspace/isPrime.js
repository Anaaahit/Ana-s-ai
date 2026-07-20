/**
 * Checks if a number is prime.
 * @param {number} n
 * @returns {boolean}
 */
function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

// Simple test cases
const testCases = [1, 2, 3, 4, 11, 15, 17, 20, 29];
testCases.forEach(num => {
  console.log(`${num} is prime: ${isPrime(num)}`);
});
