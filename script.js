// Language detection and translation
function getBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.split('-')[0]; // Get the primary language code
}

function translatePage(lang) {
    // Use French as fallback if translation not available
    const currentLang = translations[lang] ? lang : 'fr';
    
    // Update HTML lang attribute
    document.documentElement.lang = currentLang;
    
    // Translate all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            element.textContent = translations[currentLang][key];
        }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            element.placeholder = translations[currentLang][key];
        }
    });
}

// Initialize translations
document.addEventListener('DOMContentLoaded', () => {
    const userLang = getBrowserLanguage();
    translatePage(userLang);
});

// Email formatting functions
function normalizeAccentedChars(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatEmailAddresses(names, domain, style) {
    return names.map(name => {
        // Normalize accented characters
        name = normalizeAccentedChars(name);
        const parts = name.trim().toLowerCase().split(' ');
        
        let firstname, lastname;
        if (parts.length < 2) {
            firstname = parts[0];
            lastname = '';
        } else {
            lastname = parts[parts.length - 1];
            const firstnameParts = parts.slice(0, -1);
            firstname = firstnameParts.join('-');
        }

        let email = '';
        switch (style) {
            case 'firstname.lastname':
                email = `${firstname}.${lastname}@${domain}`;
                break;
            case 'f.lastname':
                email = `${firstname[0]}.${lastname}@${domain}`;
                break;
            case 'firstname.l':
                email = `${firstname}.${lastname[0]}@${domain}`;
                break;
            case 'firstnamelastname':
                email = `${firstname}${lastname}@${domain}`;
                break;
            case 'flastname':
                email = `${firstname[0]}${lastname}@${domain}`;
                break;
            case 'lastname.firstname':
                email = `${lastname}.${firstname}@${domain}`;
                break;
            case 'l.firstname':
                email = `${lastname[0]}.${firstname}@${domain}`;
                break;
            case 'initials':
                email = `${firstname[0]}${lastname[0]}@${domain}`;
                break;
        }

        // Clean email
        email = email.replace(/[^a-z0-9.@-]/g, '');
        const [localPart, domainPart] = email.split('@');
        const cleanLocalPart = localPart.replace(/-+/g, '-').replace(/^-|-$/g, '');
        const cleanDomain = domainPart.replace(/-+/g, '-').replace(/^-|-$/g, '');
        return `${cleanLocalPart}@${cleanDomain}`;
    });
}

function formatEmailAllStyles(names, domain) {
    const styles = {
        'firstname.lastname': [],
        'f.lastname': [],
        'firstname.l': [],
        'firstnamelastname': [],
        'flastname': [],
        'lastname.firstname': [],
        'l.firstname': [],
        'initials': []
    };

    for (const style in styles) {
        styles[style] = formatEmailAddresses(names, domain, style);
    }

    return styles;
}

// Email validation function
async function validateEmail(email) {
    // Basic regex validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9]{2,}$/;
    if (!emailRegex.test(email)) {
        return false;
    }

    // Here you would typically make an API call to validate the email
    // For now, we'll just return true if the format is valid
    return true;
}

// UI handling
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search');
    const searchButton = searchInput.nextElementSibling;
    const resultsContainer = document.querySelector('.space-y-4');

    // Function to copy text to clipboard
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }

    // Function to create copy button
    function createCopyButton(emails) {
        const button = document.createElement('button');
        button.className = 'ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition duration-200';
        button.innerHTML = translations[document.documentElement.lang || 'fr'].copyEmails;
        button.onclick = async () => {
            const emailList = emails.join('\n');
            const success = await copyToClipboard(emailList);
            if (success) {
                button.innerHTML = translations[document.documentElement.lang || 'fr'].copied;
                button.classList.add('bg-green-100', 'text-green-700');
                setTimeout(() => {
                    button.innerHTML = translations[document.documentElement.lang || 'fr'].copyEmails;
                    button.classList.remove('bg-green-100', 'text-green-700');
                }, 2000);
            } else {
                button.innerHTML = translations[document.documentElement.lang || 'fr'].copyError;
                button.classList.add('bg-red-100', 'text-red-700');
                setTimeout(() => {
                    button.innerHTML = translations[document.documentElement.lang || 'fr'].copyEmails;
                    button.classList.remove('bg-red-100', 'text-red-700');
                }, 2000);
            }
        };
        return button;
    }

    searchButton.addEventListener('click', async () => {
        const searchValue = searchInput.value.trim();
        if (!searchValue) return;

        // Clear previous results
        resultsContainer.innerHTML = '';

        // Split input into names and domain
        const [names, domain] = searchValue.split('@').map(s => s.trim());
        if (!names || !domain) {
            resultsContainer.innerHTML = `
                <div class="p-4 border border-gray-200 rounded-lg">
                    <p class="text-red-600">${translations[document.documentElement.lang || 'fr'].invalidFormat}</p>
                </div>
            `;
            return;
        }

        const nameList = names.split(',').map(n => n.trim());
        const allFormats = formatEmailAllStyles(nameList, domain);
        const allEmails = [];

        // Display results
        for (const name of nameList) {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-150';
            
            let resultHtml = `<div class="flex items-center justify-between mb-2">
                <h3 class="font-medium text-gray-800">${name}</h3>
            </div>`;
            resultHtml += '<div class="space-y-2">';

            const nameEmails = [];
            for (const [style, emails] of Object.entries(allFormats)) {
                const email = emails[nameList.indexOf(name)];
                const isValid = await validateEmail(email);
                nameEmails.push(email);
                resultHtml += `
                    <div class="flex items-center justify-between">
                        <span class="text-gray-600">${style}: ${email}</span>
                        <span class="${isValid ? 'text-green-600' : 'text-red-600'}">
                            ${isValid ? '✓' : '✗'}
                        </span>
                    </div>
                `;
            }

            resultHtml += '</div>';
            resultDiv.innerHTML = resultHtml;

            // Add copy button for this name's emails
            const copyButton = createCopyButton(nameEmails);
            resultDiv.querySelector('.flex.items-center.justify-between.mb-2').appendChild(copyButton);
            
            resultsContainer.appendChild(resultDiv);
            allEmails.push(...nameEmails);
        }

        // Add a button to copy all emails
        const allEmailsDiv = document.createElement('div');
        allEmailsDiv.className = 'mt-4 flex justify-end';
        const copyAllButton = createCopyButton(allEmails);
        copyAllButton.innerHTML = 'Copier tous les emails';
        copyAllButton.className = 'px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition duration-200';
        allEmailsDiv.appendChild(copyAllButton);
        resultsContainer.appendChild(allEmailsDiv);
    });
}); 