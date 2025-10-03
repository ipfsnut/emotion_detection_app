// View Manager for handling different display layouts
export class ViewManager {
    constructor() {
        this.currentView = 'grid';
        this.initializeControls();
    }

    initializeControls() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
    }

    switchView(view) {
        const container = document.getElementById('imageContainer');
        const buttons = document.querySelectorAll('.view-btn');
        
        // Remove all view classes
        container.classList.remove('grid-view', 'list-view', 'compact-view');
        
        // Add new view class
        container.classList.add(`${view}-view`);
        
        // Update active button
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });
        
        this.currentView = view;
    }

    showViewControls() {
        const controlsSection = document.getElementById('viewControls');
        if (controlsSection) {
            controlsSection.style.display = 'block';
        }
    }

    hideViewControls() {
        const controlsSection = document.getElementById('viewControls');
        if (controlsSection) {
            controlsSection.style.display = 'none';
        }
    }
}

// Initialize view manager when module is imported
const viewManager = new ViewManager();
export default viewManager;