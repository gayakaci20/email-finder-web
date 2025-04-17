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

// Store for managing people
let people = [];

// DOM Elements
const form = document.getElementById('personForm');
const peopleList = document.getElementById('peopleList');
const resultsContainer = document.getElementById('resultsContainer');
const generateEmailsButton = document.getElementById('generateEmails');

// Add person to the list
function addPerson(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const domain = document.getElementById('domain').value.trim();
    
    if (!firstName || !lastName || !domain) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    const person = {
        id: Date.now(),
        firstName,
        lastName,
        domain
    };
    
    people.push(person);
    updatePeopleList();
    form.reset();
}

// Remove person from the list
function removePerson(id) {
    people = people.filter(person => person.id !== id);
    updatePeopleList();
    generateEmailSuggestions();
}

// Update the people list display
function updatePeopleList() {
    peopleList.innerHTML = '';
    
    if (people.length === 0) {
        peopleList.innerHTML = `
            <div class="p-3 sm:p-4 border border-gray-200 rounded-lg">
                <p class="text-sm sm:text-base text-gray-600" data-i18n="noResults">
                    Aucune personne ajoutée. Utilisez le formulaire ci-dessus pour ajouter des personnes.
                </p>
            </div>
        `;
        return;
    }
    
    people.forEach(person => {
        const personElement = document.createElement('div');
        personElement.className = 'flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg mb-2';
        personElement.innerHTML = `
            <div class="flex-grow">
                <p class="text-sm sm:text-base font-medium">${person.firstName} ${person.lastName}</p>
                <p class="text-xs sm:text-sm text-gray-500">@${person.domain}</p>
            </div>
            <button 
                onclick="removePerson(${person.id})"
                class="ml-4 text-red-600 hover:text-red-800 transition duration-200"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        `;
        peopleList.appendChild(personElement);
    });
}

// Generate email patterns for a person
function generateEmailPatterns(person) {
    const firstName = person.firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const lastName = person.lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const domain = person.domain.toLowerCase();
    
    return [
        `${firstName}.${lastName}@${domain}`,
        `${firstName}${lastName}@${domain}`,
        `${firstName[0]}.${lastName}@${domain}`,
        `${firstName}@${domain}`,
        `${lastName}.${firstName}@${domain}`,
        `${lastName}${firstName}@${domain}`,
        `${firstName[0]}${lastName}@${domain}`,
        `${lastName[0]}.${firstName}@${domain}`,
        `${firstName[0]}${lastName[0]}@${domain}`
    ];
}

// Generate email suggestions
function generateEmailSuggestions() {
    if (people.length === 0) {
        resultsContainer.innerHTML = `
            <div class="p-3 sm:p-4 border border-gray-200 rounded-lg">
                <p class="text-sm sm:text-base text-gray-600" data-i18n="noResults">
                    Ajoutez des personnes pour générer des suggestions d'emails.
                </p>
            </div>
        `;
        return;
    }

    const allEmails = [];
    const suggestions = people.map(person => {
        const patterns = generateEmailPatterns(person);
        allEmails.push(...patterns);
        return {
            name: `${person.firstName} ${person.lastName}`,
            domain: person.domain,
            patterns
        };
    });

    resultsContainer.innerHTML = `
        <div class="space-y-4">
            ${suggestions.map(suggestion => `
                <div class="p-3 sm:p-4 border border-gray-200 rounded-lg">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm sm:text-base font-medium">${suggestion.name} (@${suggestion.domain})</h3>
                        <button 
                            onclick="copyToClipboard('${suggestion.patterns.join('\\n')}')"
                            class="text-blue-600 hover:text-blue-800 transition duration-200"
                            title="Copier les emails"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                        </button>
                    </div>
                    <ul class="space-y-1">
                        ${suggestion.patterns.map(pattern => `
                            <li class="text-sm sm:text-base text-gray-600">${pattern}</li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
            <div class="flex justify-end mt-4">
                <button 
                    onclick="copyToClipboard('${allEmails.join('\\n')}')"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copier tous les emails
                </button>
            </div>
        </div>
    `;
}

// Event Listeners
form.addEventListener('submit', addPerson);
generateEmailsButton.addEventListener('click', generateEmailSuggestions);

// Initialize the display
updatePeopleList();
generateEmailSuggestions(); 