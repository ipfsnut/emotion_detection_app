// Baseline Calibration Manager
export class BaselineManager {
    constructor() {
        this.hasBaseline = false;
        this.baselineInfo = null;
        this.initializeElements();
        this.attachEventListeners();
        this.checkBaselineStatus();
    }

    initializeElements() {
        this.setBaselineBtn = document.getElementById('setBaselineBtn');
        this.clearBaselineBtn = document.getElementById('clearBaselineBtn');
        this.baselineStatus = document.getElementById('baselineStatus');
        this.useBaselineCheckbox = document.getElementById('useBaseline');
        this.baselineCheckboxContainer = document.querySelector('.baseline-checkbox');
        this.fileInput = document.getElementById('fileInput');
    }

    attachEventListeners() {
        if (this.setBaselineBtn) {
            this.setBaselineBtn.addEventListener('click', () => this.setBaseline());
        }
        
        if (this.clearBaselineBtn) {
            this.clearBaselineBtn.addEventListener('click', () => this.clearBaseline());
        }
    }

    async checkBaselineStatus() {
        try {
            const response = await fetch('/baseline_info');
            const data = await response.json();
            
            this.hasBaseline = data.has_baseline;
            this.baselineInfo = data.baseline_info;
            
            this.updateUI();
        } catch (error) {
            console.error('Error checking baseline status:', error);
        }
    }

    async setBaseline() {
        // Check if user has selected a file
        if (!this.fileInput.files || this.fileInput.files.length === 0) {
            alert('Please select an image file first to set as baseline');
            return;
        }

        const file = this.fileInput.files[0];
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('person_id', 'default');
        
        // Show loading state
        this.setBaselineBtn.disabled = true;
        this.setBaselineBtn.textContent = '⏳ Analyzing neutral face...';
        
        try {
            const response = await fetch('/set_baseline', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hasBaseline = true;
                this.baselineInfo = data.baseline_info;
                
                // Show success message
                this.showBaselineResult(data.facs_result);
                this.updateUI();
                
                // Clear file input
                this.fileInput.value = '';
                
                alert(`✅ Baseline set successfully!\n${data.facs_result.total_aus_detected} Action Units detected`);
            } else {
                alert(`❌ Failed to set baseline: ${data.error}`);
            }
        } catch (error) {
            console.error('Error setting baseline:', error);
            alert('❌ Failed to set baseline');
        } finally {
            this.setBaselineBtn.disabled = false;
            this.setBaselineBtn.textContent = '📸 Set Neutral Baseline';
        }
    }

    async clearBaseline() {
        if (!confirm('Are you sure you want to clear the baseline?')) {
            return;
        }
        
        try {
            const response = await fetch('/clear_baseline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ person_id: 'default' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hasBaseline = false;
                this.baselineInfo = null;
                this.updateUI();
                alert('✅ Baseline cleared');
            } else {
                alert(`❌ Failed to clear baseline: ${data.error}`);
            }
        } catch (error) {
            console.error('Error clearing baseline:', error);
            alert('❌ Failed to clear baseline');
        }
    }

    updateUI() {
        if (this.hasBaseline && this.baselineInfo) {
            // Show baseline info
            this.baselineStatus.innerHTML = `
                <span class="status-active">✅ Baseline Active</span>
                <span class="baseline-details">
                    ${this.baselineInfo.total_aus} AUs • 
                    ${this.baselineInfo.age_minutes} min ago
                </span>
            `;
            
            // Show clear button, hide set button
            this.setBaselineBtn.style.display = 'none';
            this.clearBaselineBtn.style.display = 'inline-block';
            
            // Show comparison checkbox
            if (this.baselineCheckboxContainer) {
                this.baselineCheckboxContainer.style.display = 'block';
                this.useBaselineCheckbox.checked = true;
            }
        } else {
            // No baseline
            this.baselineStatus.innerHTML = '<span class="status-text">No baseline set</span>';
            
            // Show set button, hide clear button
            this.setBaselineBtn.style.display = 'inline-block';
            this.clearBaselineBtn.style.display = 'none';
            
            // Hide comparison checkbox
            if (this.baselineCheckboxContainer) {
                this.baselineCheckboxContainer.style.display = 'none';
                this.useBaselineCheckbox.checked = false;
            }
        }
    }

    showBaselineResult(facsResult) {
        // Create a temporary display for baseline AUs
        const resultContainer = document.createElement('div');
        resultContainer.className = 'baseline-result-preview';
        resultContainer.innerHTML = `
            <h4>📸 Baseline Captured</h4>
            <div class="baseline-aus">
                ${Object.entries(facsResult.action_units)
                    .map(([au, data]) => `
                        <div class="baseline-au-item">
                            <span class="au-code">${au}</span>
                            <span class="au-intensity">${(data.intensity * 100).toFixed(1)}%</span>
                            <span class="au-desc">${data.description}</span>
                        </div>
                    `).join('')}
            </div>
        `;
        
        // Add to results area temporarily
        const resultsSection = document.getElementById('results');
        if (resultsSection) {
            resultsSection.innerHTML = '';
            resultsSection.appendChild(resultContainer);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                resultContainer.style.opacity = '0';
                setTimeout(() => resultContainer.remove(), 500);
            }, 5000);
        }
    }

    // Check if baseline comparison should be used
    shouldUseBaseline() {
        return this.hasBaseline && this.useBaselineCheckbox && this.useBaselineCheckbox.checked;
    }

    // Get baseline parameters for form submission
    getBaselineParams() {
        if (this.shouldUseBaseline()) {
            return {
                use_baseline: 'true'
            };
        }
        return {
            use_baseline: 'false'
        };
    }
}

// Create global instance
export const baselineManager = new BaselineManager();