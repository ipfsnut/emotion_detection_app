import { initializeFileHandler } from './fileHandler.js';
import { initializeFormSubmission } from './formSubmission.js';
import { initializeExportButton } from './exportData.js';
import { initializeVideoProcessor } from './videoProcessor.js';
import viewManager from './viewManager.js';
import { baselineManager } from './baselineManager.js';

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const imageContainer = document.getElementById('imageContainer');
    const exportButton = document.getElementById('exportButton');
    const comparisonSection = document.getElementById('comparisonSection');
    const comparisonGraph = document.getElementById('comparisonGraph');
    const videoInput = document.getElementById('videoInput');

    initializeVideoProcessor(videoInput, imageContainer, form);
    initializeFileHandler(fileInput, imageContainer);
    initializeFormSubmission(form, imageContainer, exportButton, comparisonSection, comparisonGraph);
    initializeExportButton(exportButton);
    
    // Export viewManager and baselineManager to global scope for use in other modules
    window.viewManager = viewManager;
    window.baselineManager = baselineManager;
});