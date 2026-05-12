const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🟢 PitchMind API running on http://localhost:${PORT}\n`);
});
