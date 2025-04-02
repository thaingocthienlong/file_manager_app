const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ensureAuthenticated } = require('../middleware/auth');

// Set storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const userDir = `${process.env.USER_FILES_DIR}/${req.session.user.id}`;
    // Ensure directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
}).single('file');

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif|doc|docx|pdf|txt|csv|zip|rar/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extname) {
    return cb(null, true);
  } else {
    cb('Error: Invalid file type!');
  }
}

// Home page - file listing
router.get('/', ensureAuthenticated, (req, res) => {
  try {
    const userId = req.session.user.id;
    const currentPath = req.query.path || '';
    const userDir = `${process.env.USER_FILES_DIR}/${userId}`;
    const fullPath = path.join(userDir, currentPath);
    
    // Ensure user can't access files outside their directory
    if (!fullPath.startsWith(userDir)) {
      req.flash('error', 'Access denied');
      return res.redirect('/');
    }
    
    // Read directory
    const items = fs.readdirSync(fullPath);
    
    // Map items to file/folder objects
    const fileItems = items.map(item => {
      const itemPath = path.join(fullPath, item);
      const stats = fs.statSync(itemPath);
      
      return {
        name: item,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        lastModified: stats.mtime.toISOString().split('T')[0],
        path: path.join(currentPath, item)
      };
    });
    
    // Sort directories first, then files
    const sortedItems = fileItems.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Generate breadcrumb
    const breadcrumb = [];
    let cumPath = '';
    
    breadcrumb.push({ name: 'Home', path: '' });
    
    if (currentPath) {
      const parts = currentPath.split(path.sep).filter(Boolean);
      
      parts.forEach(part => {
        cumPath = path.join(cumPath, part);
        breadcrumb.push({ name: part, path: cumPath });
      });
    }
    
    res.render('index', {
      user: req.session.user,
      files: sortedItems,
      currentPath,
      breadcrumb,
      error_msg: req.flash('error'),
      success_msg: req.flash('success')
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to read directory');
    res.redirect('/');
  }
});

// Create new folder
router.post('/create-folder', ensureAuthenticated, (req, res) => {
  const { folderName, path: currentPath } = req.body;
  const userId = req.session.user.id;
  const userDir = `${process.env.USER_FILES_DIR}/${userId}`;
  const newFolderPath = path.join(userDir, currentPath || '', folderName);
  
  try {
    if (!fs.existsSync(newFolderPath)) {
      fs.mkdirSync(newFolderPath);
      req.flash('success', 'Folder created successfully');
    } else {
      req.flash('error', 'Folder already exists');
    }
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to create folder');
  }
  
  res.redirect(`/?path=${encodeURIComponent(currentPath || '')}`);
});

// Upload file
router.post('/upload', ensureAuthenticated, (req, res) => {
  const currentPath = req.query.path || '';
  
  upload(req, res, (err) => {
    if (err) {
      req.flash('error', err);
      return res.redirect(`/?path=${encodeURIComponent(currentPath)}`);
    }
    
    if (!req.file) {
      req.flash('error', 'No file selected');
      return res.redirect(`/?path=${encodeURIComponent(currentPath)}`);
    }
    
    req.flash('success', 'File uploaded successfully');
    res.redirect(`/?path=${encodeURIComponent(currentPath)}`);
  });
});

// Download file
router.get('/download/:filePath', ensureAuthenticated, (req, res) => {
    const filePath = req.params.filePath;
  
  const userId = req.session.user.id;
  const userDir = `${process.env.USER_FILES_DIR}/${userId}`;
  const fullPath = path.join(userDir, filePath);
  
  // Security check
  if (!fullPath.startsWith(userDir)) {
    req.flash('error', 'Access denied');
    return res.redirect('/');
  }
  
  try {
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      // For directories, implement zip functionality 
      // (requires additional implementation)
      req.flash('error', 'Directory download not implemented yet');
      return res.redirect(`/?path=${path.dirname(filePath)}`);
    }
    
    // For files, send the file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(fullPath)}`);
    
    // Send file with throttling
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to download file');
    res.redirect('/');
  }
});

// Delete file/folder
router.post('/delete', ensureAuthenticated, (req, res) => {
  const { path: itemPath } = req.body;
  const userId = req.session.user.id;
  const userDir = `${process.env.USER_FILES_DIR}/${userId}`;
  const fullPath = path.join(userDir, itemPath);
  
  // Security check
  if (!fullPath.startsWith(userDir)) {
    req.flash('error', 'Access denied');
    return res.redirect('/');
  }
  
  try {
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      // For directories, use recursive option (requires Node.js 12+)
      fs.rmdirSync(fullPath, { recursive: true });
    } else {
      // For files
      fs.unlinkSync(fullPath);
    }
    
    req.flash('success', 'Item deleted successfully');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to delete item');
  }
  
  // Redirect to parent directory
  const parentPath = path.dirname(itemPath);
  res.redirect(`/?path=${encodeURIComponent(parentPath === '.' ? '' : parentPath)}`);
});

// Rename file/folder
router.post('/rename', ensureAuthenticated, (req, res) => {
  const { oldPath, newName } = req.body;
  const userId = req.session.user.id;
  const userDir = `${process.env.USER_FILES_DIR}/${userId}`;
  const fullOldPath = path.join(userDir, oldPath);
  
  // Security check
  if (!fullOldPath.startsWith(userDir)) {
    req.flash('error', 'Access denied');
    return res.redirect('/');
  }
  
  try {
    const dirName = path.dirname(oldPath);
    const newPath = path.join(dirName, newName);
    const fullNewPath = path.join(userDir, newPath);
    
    fs.renameSync(fullOldPath, fullNewPath);
    req.flash('success', 'Item renamed successfully');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to rename item');
  }
  
  // Redirect to current directory
  const parentPath = path.dirname(oldPath);
  res.redirect(`/?path=${encodeURIComponent(parentPath === '.' ? '' : parentPath)}`);
});

module.exports = router;