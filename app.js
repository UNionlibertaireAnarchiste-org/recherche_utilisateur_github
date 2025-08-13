const API = "https://api.github.com/users/";
const resultat = document.querySelector(".resultat");
const form = document.querySelector(".form-github-recherche");
const inp = document.querySelector(".inp-search");
const loading = document.querySelector(".loading");

// Fonction pour échapper le HTML et prévenir XSS
function escapeHtml(text) {
    if (!text) return 'Non renseigné';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Validation du nom d'utilisateur
function isValidUsername(username) {
    return /^[a-zA-Z0-9\-]+$/.test(username) && username.length <= 39;
}

// Fonction pour afficher les erreurs
function showError(message) {
    resultat.innerHTML = `<div class="erreur">${escapeHtml(message)}</div>`;
}

// Fonction asynchrone pour récupérer les données
async function dataGithub(utilisateur) {
    if (!isValidUsername(utilisateur)) {
        showError("Nom d'utilisateur invalide. Utilisez uniquement des lettres, chiffres et tirets.");
        return;
    }

    loading.style.display = 'block';
    resultat.innerHTML = '';
    
    // Ajouter à l'historique
    addToHistory(utilisateur);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const reponse = await fetch(`${API}${encodeURIComponent(utilisateur)}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                // Décommentez et ajoutez votre token GitHub pour 5000 requêtes/heure
                // 'Authorization': 'token VOTRE_TOKEN_ICI'
            }
        });

        clearTimeout(timeoutId);

        if (!reponse.ok) {
            if (reponse.status === 404) {
                showError("Utilisateur introuvable. Vérifiez le nom d'utilisateur.");
            } else if (reponse.status === 403) {
                showError("Limite de requêtes atteinte. Réessayez plus tard.");
            } else {
                showError("Erreur lors de la recherche. Réessayez.");
            }
            return;
        }

        const data = await reponse.json();
        await creationCarte(data);

    } catch (error) {
        if (error.name === 'AbortError') {
            showError("Délai d'attente dépassé. Vérifiez votre connexion.");
        } else {
            showError("Erreur de connexion. Vérifiez votre réseau.");
        }
    } finally {
        loading.style.display = 'none';
    }
}

// Fonction pour créer la carte utilisateur
async function creationCarte(user) {
    const carte = document.createElement('div');
    carte.className = 'carte';
    
    // Récupération des repos et organisations
    const [repos, orgs] = await Promise.all([
        fetchUserRepos(user.login),
        fetchUserOrgs(user.login)
    ]);
    
    carte.innerHTML = `
        <img src="${escapeHtml(user.avatar_url)}" alt="Avatar de ${escapeHtml(user.login)}" class="avatar" loading="lazy">
        <h2>${escapeHtml(user.name || user.login)}</h2>
        <div class="username">@${escapeHtml(user.login)}</div>
        

        
        <ul class="count-infos">
            <li><button class="stat-btn" onclick="toggleFollowers('${user.login}', 'followers')"><span>Followers</span>: ${parseInt(user.followers) || 0}</button></li>
            <li><button class="stat-btn" onclick="toggleFollowers('${user.login}', 'following')"><span>Following</span>: ${parseInt(user.following) || 0}</button></li>
            <li><span>Repos publics</span>: ${parseInt(user.public_repos) || 0}</li>
            <li><span>Biographie</span>: ${escapeHtml(user.bio)}</li>
            <li><span>Localisation</span>: ${escapeHtml(user.location)}</li>
            <li><span>Membre depuis</span>: ${new Date(user.created_at).toLocaleDateString('fr-FR')}</li>
        </ul>
        
        ${repos.length > 0 ? `
        <div class="repos-section">
            <h3>Repos populaires</h3>
            <div class="repos-grid">
                ${repos.slice(0, 3).map(repo => `
                    <div class="repo-card">
                        <h4>${escapeHtml(repo.name)}</h4>
                        <p>${escapeHtml(repo.description || 'Pas de description')}</p>
                        <div class="repo-stats">
                            <span>⭐ ${repo.stargazers_count}</span>
                            <span>🍴 ${repo.forks_count}</span>
                            ${repo.language ? `<span class="language">${escapeHtml(repo.language)}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${orgs.length > 0 ? `
        <div class="orgs-section">
            <h3>Organisations</h3>
            <div class="orgs-grid">
                ${orgs.slice(0, 4).map(org => `
                    <div class="org-item">
                        <img src="${escapeHtml(org.avatar_url)}" alt="${escapeHtml(org.login)}" class="org-avatar">
                        <span>${escapeHtml(org.login)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="actions">
            ${user.html_url ? `<a href="${escapeHtml(user.html_url)}" target="_blank" rel="noopener noreferrer" class="profile-link">Voir le profil</a>` : ''}
            <button class="share-btn">Partager</button>
        </div>
    `;
    
    resultat.innerHTML = '';
    resultat.appendChild(carte);
}

// Fonction pour récupérer les repos de l'utilisateur
async function fetchUserRepos(username) {
    try {
        const response = await fetch(`${API}${username}/repos?sort=stars&per_page=100`);
        if (response.ok) {
            const repos = await response.json();
            const selectedLanguage = document.querySelector('.language-filter').value;
            
            if (selectedLanguage) {
                return repos.filter(repo => repo.language === selectedLanguage).slice(0, 6);
            }
            return repos.slice(0, 6);
        }
    } catch (error) {
        console.error('Erreur repos:', error);
    }
    return [];
}

// Fonction pour récupérer les organisations
async function fetchUserOrgs(username) {
    try {
        const response = await fetch(`${API}${username}/orgs`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur orgs:', error);
    }
    return [];
}

// Fonction pour récupérer les followers
async function fetchFollowers(username) {
    try {
        const response = await fetch(`${API}${username}/followers?per_page=12`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur followers:', error);
    }
    return [];
}

// Fonction pour récupérer les following
async function fetchFollowing(username) {
    try {
        const response = await fetch(`${API}${username}/following?per_page=12`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Erreur following:', error);
    }
    return [];
}

// Gestion de l'historique
function addToHistory(username) {
    let history = JSON.parse(localStorage.getItem('github-search-history') || '[]');
    
    // Éviter les doublons
    history = history.filter(item => item !== username);
    history.unshift(username);
    
    // Limiter à 10 éléments
    history = history.slice(0, 10);
    
    localStorage.setItem('github-search-history', JSON.stringify(history));
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem('github-search-history') || '[]');
    const historyContainer = document.querySelector('.search-history');
    const historyItems = document.querySelector('.history-items');
    
    if (history.length > 0) {
        historyContainer.style.display = 'block';
        historyItems.innerHTML = history.map(username => 
            `<button class="history-item">${username}</button>`
        ).join('');
    } else {
        historyContainer.style.display = 'none';
    }
}

function searchFromHistory(username) {
    dataGithub(username);
}

function clearHistory() {
    localStorage.removeItem('github-search-history');
    displayHistory();
}

// Fonction pour copier le profil dans le presse-papier
async function shareProfile(username, profileUrl) {
    const text = `Découvrez le profil GitHub de ${username}: ${profileUrl}`;
    
    try {
        await navigator.clipboard.writeText(text);
        // Feedback visuel
        const btn = document.querySelector('.share-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copié !';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    } catch (err) {
        console.error('Erreur copie:', err);
        alert('Impossible de copier. Voici le lien: ' + text);
    }
}

// Fonction pour basculer l'affichage des followers/following
function toggleFollowers(username, type) {
    const existingSection = document.querySelector(`.${type}-section`);
    if (existingSection) {
        existingSection.remove();
        return;
    }
    
    if (type === 'followers') {
        showFollowers(username);
    } else {
        showFollowing(username);
    }
}

async function showFollowers(username) {
    const followers = await fetchFollowers(username);
    const carte = document.querySelector('.carte');
    
    const followersSection = document.createElement('div');
    followersSection.className = 'followers-section';
    followersSection.innerHTML = `
        <h3>Followers (${followers.length})</h3>
        <div class="followers-grid">
            ${followers.map(follower => `
                <div class="follower-item" onclick="dataGithub('${follower.login}')">
                    <img src="${escapeHtml(follower.avatar_url)}" alt="${escapeHtml(follower.login)}" class="follower-avatar">
                    <span>${escapeHtml(follower.login)}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    carte.appendChild(followersSection);
}

async function showFollowing(username) {
    const following = await fetchFollowing(username);
    const carte = document.querySelector('.carte');
    
    const followingSection = document.createElement('div');
    followingSection.className = 'following-section';
    followingSection.innerHTML = `
        <h3>Following (${following.length})</h3>
        <div class="following-grid">
            ${following.map(user => `
                <div class="following-item" onclick="dataGithub('${user.login}')">
                    <img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.login)}" class="following-avatar">
                    <span>${escapeHtml(user.login)}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    carte.appendChild(followingSection);
}

// Gestionnaire d'événement pour le formulaire
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = inp.value.trim();
    
    if (username.length > 0) {
        dataGithub(username);
        inp.value = "";
    }
});

// Gestionnaire pour le changement de langage
document.querySelector('.language-filter').addEventListener('change', () => {
    const currentUser = document.querySelector('.username');
    if (currentUser) {
        const username = currentUser.textContent.replace('@', '');
        dataGithub(username);
    }
});

// Gestionnaire pour effacer l'historique et partage
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('clear-history')) {
        clearHistory();
    }
    if (e.target.classList.contains('share-btn')) {
        const carte = e.target.closest('.carte');
        if (carte) {
            const username = carte.querySelector('.username').textContent.replace('@', '');
            const profileUrl = `https://github.com/${username}`;
            shareProfile(username, profileUrl);
        }
    }
    if (e.target.classList.contains('history-item')) {
        const username = e.target.textContent;
        dataGithub(username);
    }
});

// Recherche en temps réel (optionnel)
let searchTimeout;
inp.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const value = e.target.value.trim();
    
    if (value.length >= 3) {
        searchTimeout = setTimeout(() => {
            dataGithub(value);
        }, 500);
    }
});

// Effets visuels révolutionnaires
document.addEventListener('DOMContentLoaded', () => {
    // Afficher l'historique au chargement
    displayHistory();
    
    // Effet de parallaxe sur le titre
    const title = document.querySelector('h1');
    title.setAttribute('data-text', title.textContent);
    
    // Effet de suivi de souris
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        document.body.style.setProperty('--mouse-x', x + '%');
        document.body.style.setProperty('--mouse-y', y + '%');
    });
    
    // Effet de particules interactives
    createParticles();
});

function createParticles() {
    const particleCount = 50;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 2px;
            height: 2px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            pointer-events: none;
            z-index: -1;
        `;
        
        particle.x = Math.random() * window.innerWidth;
        particle.y = Math.random() * window.innerHeight;
        particle.vx = (Math.random() - 0.5) * 0.5;
        particle.vy = (Math.random() - 0.5) * 0.5;
        
        document.body.appendChild(particle);
        particles.push(particle);
    }
    
    function animateParticles() {
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            if (particle.x < 0 || particle.x > window.innerWidth) particle.vx *= -1;
            if (particle.y < 0 || particle.y > window.innerHeight) particle.vy *= -1;
            
            particle.style.left = particle.x + 'px';
            particle.style.top = particle.y + 'px';
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}