const WspRoutes = require('./routes/WspRoutes');
console.log('WSP Routes exported:', !!WspRoutes);
console.log('Stack:', WspRoutes.stack?.map(s => s.route?.path).filter(Boolean));
