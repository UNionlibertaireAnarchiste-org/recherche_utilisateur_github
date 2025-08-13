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

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const reponse = await fetch(`${API}${encodeURIComponent(utilisateur)}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/vnd.github.v3+json'
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
        creationCarte(data);

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
function creationCarte(user) {
    const carte = document.createElement('div');
    carte.className = 'carte';
    
    carte.innerHTML = `
        <img src="${escapeHtml(user.avatar_url)}" alt="Avatar de ${escapeHtml(user.login)}" class="avatar" loading="lazy">
        <h2>${escapeHtml(user.name || user.login)}</h2>
        <div class="username">@${escapeHtml(user.login)}</div>
        <ul class="count-infos">
            <li><span>Followers</span>: ${parseInt(user.followers) || 0}</li>
            <li><span>Following</span>: ${parseInt(user.following) || 0}</li>
            <li><span>Repos publics</span>: ${parseInt(user.public_repos) || 0}</li>
            <li><span>Biographie</span>: ${escapeHtml(user.bio)}</li>
            <li><span>Localisation</span>: ${escapeHtml(user.location)}</li>
            <li><span>Membre depuis</span>: ${new Date(user.created_at).toLocaleDateString('fr-FR')}</li>
        </ul>
        ${user.html_url ? `<a href="${escapeHtml(user.html_url)}" target="_blank" rel="noopener noreferrer" class="profile-link">Voir le profil</a>` : ''}
    `;
    
    resultat.innerHTML = '';
    resultat.appendChild(carte);
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
    // Effet de parallaxe sur le titre
    const title = document.querySelector('h1');
    title.setAttribute('data-text', title.textContent);
    
    // Effet de suivi de souris
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        
        document.body.style.setProperty('--mouse-x', x + '%');
        document.body.style.setProperty('--mouse-y', y + '%');
        
        // Effet de rotation 3D sur les cartes
        const carte = document.querySelector('.carte');
        if (carte) {
            const rect = carte.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const rotateX = (e.clientY - centerY) / 10;
            const rotateY = (centerX - e.clientX) / 10;
            
            carte.style.transform = `translateY(-15px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        }
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