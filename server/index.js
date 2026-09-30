require('./config/env');
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Resume Parser & Analyzer backend running on port ${PORT}`);
});
