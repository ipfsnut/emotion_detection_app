export class AboutManager {
    constructor() {
        this.aboutContainer = document.createElement('div');
        this.aboutContainer.className = 'collapsible-container';
        this.init();
    }

    init() {
        this.createAboutToggle();
        this.createAboutContent();
        document.querySelector('main').appendChild(this.aboutContainer);
    }

    createAboutToggle() {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'collapse-btn';
        toggleButton.textContent = 'About';
        this.aboutContainer.appendChild(toggleButton);
    }

    createAboutContent() {
        const aboutContent = document.createElement('div');
        aboutContent.className = 'collapsible-content';
        aboutContent.innerHTML = `
            <h2>About</h2>
            <a href="https://docs.google.com/presentation/d/1RKhOt9XcOiN5V72jICoBjtcuOqT7CL0GG-TI6q_ufyk/edit?usp=sharing" target="_blank">View Presentation</a>
        `;
        this.aboutContainer.appendChild(aboutContent);
    }
}
