// Test script for timer fixes
const { formatDuration, getElapsedSeconds, isValidDate } = require('./resources/js/utils/time.ts');

console.log('Testing formatDuration function:');
console.log('formatDuration(0):', formatDuration(0));
console.log('formatDuration(3661):', formatDuration(3661));
console.log('formatDuration(null):', formatDuration(null));
console.log('formatDuration(undefined):', formatDuration(undefined));
console.log('formatDuration(NaN):', formatDuration(NaN));
console.log('formatDuration(-5):', formatDuration(-5));

console.log('\nTesting isValidDate function:');
console.log('isValidDate("2024-01-01T10:00:00"):', isValidDate("2024-01-01T10:00:00"));
console.log('isValidDate("invalid date"):', isValidDate("invalid date"));
console.log('isValidDate(null):', isValidDate(null));
console.log('isValidDate(undefined):', isValidDate(undefined));

console.log('\nTesting getElapsedSeconds function:');
const testDate = new Date();
testDate.setMinutes(testDate.getMinutes() - 5); // 5 minutes ago
console.log('getElapsedSeconds for 5 minutes ago:', getElapsedSeconds(testDate.toISOString()));
console.log('getElapsedSeconds with invalid date:', getElapsedSeconds("invalid date"));
console.log('getElapsedSeconds with null:', getElapsedSeconds(null));

console.log('\nAll tests completed!');
