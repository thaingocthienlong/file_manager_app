document.addEventListener('DOMContentLoaded', function() {
    // File upload with progress bar
    const uploadForm = document.getElementById('upload-form');
    const progressBar = document.querySelector('.progress-bar');
    const progressContainer = document.querySelector('.progress');
    const uploadButton = document.getElementById('upload-button');
    
    if (uploadForm) {
      uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('file-input');
        if (!fileInput.files[0]) {
          alert('Please select a file');
          return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        // Show progress bar
        progressContainer.style.display = 'block';
        uploadButton.disabled = true;
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadForm.action, true);
        
        // Track upload progress
        xhr.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
          }
        };
        
        // Handle response
        xhr.onload = function() {
          if (xhr.status === 200) {
            // Reload page to show new file
            window.location.reload();
          } else {
            alert('Upload failed');
            progressContainer.style.display = 'none';
            uploadButton.disabled = false;
          }
        };
        
        xhr.send(formData);
      });
    }
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const fileRows = document.querySelectorAll('table tbody tr');
        
        fileRows.forEach(row => {
          const fileName = row.querySelector('td:first-child').textContent.toLowerCase();
          if (fileName.includes(searchTerm)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }
    
    // Delete confirmation
    const deleteButtons = document.querySelectorAll('.fa-trash');
    deleteButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        const row = this.closest('tr');
        const fileName = row.querySelector('td:first-child').textContent.trim();
        const filePath = this.dataset.path;
        
        // Set modal data
        document.getElementById('delete-file-name').textContent = fileName;
        document.getElementById('delete-form-path').value = filePath;
        
        // Show modal
        $('#confirm-delete').modal('show');
      });
    });
    
    // Rename functionality
    const renameButtons = document.querySelectorAll('.fa-edit');
    renameButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        
        const row = this.closest('tr');
        const fileName = row.querySelector('td:first-child').textContent.trim();
        const filePath = this.dataset.path;
        
        // Set modal data
        document.getElementById('rename-file-name').textContent = fileName;
        document.getElementById('rename-form-old-path').value = filePath;
        document.getElementById('rename-input').value = fileName;
        
        // Show modal
        $('#confirm-rename').modal('show');
      });
    });
  });