export function generatePosition() {
  const range = 300;
  return {
    x: parseFloat((Math.random() * range * 2 - range).toFixed(1)),
    y: parseFloat((Math.random() * range * 2 - range).toFixed(1)),
    z: parseFloat((Math.random() * range * 2 - range).toFixed(1)),
  };
}
