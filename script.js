document.addEventListener("DOMContentLoaded", () => {
  const options = { method: "GET", headers: { accept: "application/json" } };
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  const logoutBtn = document.getElementById("logoutBtn");
  if (isLoggedIn && logoutBtn) {
    showLogoutButton();
    hideLoginAndSignUpLinks();
  }
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  const darkModeToggle = document.getElementById("darkModeToggle");
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  if (isDarkMode) enableDarkMode();
  if (darkModeToggle) darkModeToggle.addEventListener("click", toggleDarkMode);

  let moviesData = JSON.parse(localStorage.getItem("offlineMovies")) || [];
  let currentPage = 1;
  let points = parseInt(localStorage.getItem("points")) || 0;
  let activeTime = 0;
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  let watched = JSON.parse(localStorage.getItem("watched")) || [];

  const moviesList = document.getElementById("moviesList");
  const favoritesList = document.getElementById("favoritesList");
  const watchedList = document.getElementById("watchedList");
  const newReleasesList = document.getElementById("newReleasesList");

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      currentPage++;
      loadMovies(currentPage);
    });
  }

  const searchInput = document.getElementById("searchInput");
  const genreFilter = document.getElementById("genreFilter");
  const sortSelect = document.getElementById("sortSelect");
  const yearFilter = document.getElementById("yearFilter");
  const actorFilter = document.getElementById("actorFilter");
  const durationFilter = document.getElementById("durationFilter");
  if (searchInput) {
    searchInput.addEventListener("input", filterAndSortMovies);
    genreFilter.addEventListener("change", filterAndSortMovies);
    sortSelect.addEventListener("change", filterAndSortMovies);
    yearFilter.addEventListener("input", filterAndSortMovies);
    actorFilter.addEventListener("input", filterAndSortMovies);
    durationFilter.addEventListener("input", filterAndSortMovies);
  }

  if (moviesList) {
    if (navigator.onLine) loadMovies(currentPage);
    else filterAndSortMovies();
    loadNewsFeed();
    startActiveTimeCounter();
  }

  if (favoritesList) {
    displayFavorites();
    updatePointsDisplay();
  }
  if (watchedList) displayWatched();
  if (newReleasesList) loadNewReleases();

  const movieDetails = document.getElementById("movieDetails");
  if (movieDetails) loadMovieDetails();

  const profileEmail = document.getElementById("profileEmail");
  if (profileEmail) loadProfile();

  const savedFontSize = localStorage.getItem("fontSize") || "16";
  document.body.style.fontSize = `${savedFontSize}px`;
  if (document.getElementById("fontSize")) {
    document.getElementById("fontSize").value = savedFontSize;
  }

  setupSignUpForm();
  setupLoginForm();

  function showLogoutButton() {
    logoutBtn.style.display = "block";
  }

  function hideLoginAndSignUpLinks() {
    document.querySelectorAll(".nav-link").forEach((link) => {
      if (link.textContent === "Login" || link.textContent === "Sign Up")
        link.style.display = "none";
    });
  }

  function handleLogout() {
    localStorage.removeItem("loggedIn");
    window.location.href = "login.html";
  }

  function enableDarkMode() {
    document.body.classList.add("dark-mode");
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark);
    darkModeToggle.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  function loadMovies(page) {
    const loadingSpinner = document.getElementById("loadingSpinner");
    if (loadingSpinner) loadingSpinner.style.display = "block";
    fetch(
      `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${page}&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        const newMovies = data.results.map((movie) => ({
          id: movie.id,
          title: movie.title,
          genre: movie.genre_ids,
          overview: movie.overview,
          poster_path: movie.poster_path,
          rating: movie.vote_average,
          release_date: movie.release_date,
          runtime: movie.runtime || 0, // For advanced filtering
        }));
        moviesData = [...moviesData, ...newMovies];
        localStorage.setItem("offlineMovies", JSON.stringify(moviesData));
        filterAndSortMovies();
        showNotification(`New movies loaded from page ${page}!`, "info");
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        moviesList.innerHTML =
          '<p class="text-center">Failed to load movies.</p>';
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Failed to load movies.",
          });
        }
      })
      .finally(() => {
        if (loadingSpinner) loadingSpinner.style.display = "none";
      });
  }

  function loadNewReleases() {
    const loadingSpinner = document.getElementById("loadingSpinner");
    if (loadingSpinner) loadingSpinner.style.display = "block";
    fetch(
      `https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        const newMovies = data.results.map((movie) => ({
          id: movie.id,
          title: movie.title,
          genre: movie.genre_ids,
          overview: movie.overview,
          poster_path: movie.poster_path,
          rating: movie.vote_average,
          release_date: movie.release_date,
          runtime: movie.runtime || 0,
        }));
        displayMovies(newMovies, newReleasesList);
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        newReleasesList.innerHTML =
          '<p class="text-center">Failed to load new releases.</p>';
      })
      .finally(() => {
        if (loadingSpinner) loadingSpinner.style.display = "none";
      });
  }

  function filterAndSortMovies() {
    let filteredMovies = [...moviesData];
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
      filteredMovies = filteredMovies.filter(
        (movie) =>
          movie.title.toLowerCase().includes(searchTerm) ||
          movie.overview.toLowerCase().includes(searchTerm)
      );
    }
    const genre = genreFilter.value;
    if (genre)
      filteredMovies = filteredMovies.filter((movie) =>
        movie.genre.includes(parseInt(genre))
      );
    const year = yearFilter.value;
    if (year)
      filteredMovies = filteredMovies.filter((movie) =>
        movie.release_date.startsWith(year)
      );
    const actor = actorFilter.value.toLowerCase();
    if (actor) {
      filteredMovies = filteredMovies.filter((movie) => {
        const cast = JSON.parse(localStorage.getItem(`cast_${movie.id}`)) || [];
        return cast.some((c) => c.name.toLowerCase().includes(actor));
      });
    }
    const duration = parseInt(durationFilter.value);
    if (duration)
      filteredMovies = filteredMovies.filter(
        (movie) => movie.runtime <= duration
      );
    const sortBy = sortSelect.value;
    if (sortBy) {
      if (sortBy === "title-asc")
        filteredMovies.sort((a, b) => a.title.localeCompare(b.title));
      else if (sortBy === "title-desc")
        filteredMovies.sort((a, b) => b.title.localeCompare(a.title));
      else if (sortBy === "rating-asc")
        filteredMovies.sort((a, b) => a.rating - b.rating);
      else if (sortBy === "rating-desc")
        filteredMovies.sort((a, b) => b.rating - a.rating);
    }
    displayMovies(filteredMovies);
  }

  function displayMovies(movies, targetList = moviesList) {
    if (!isLoggedIn) {
      targetList.innerHTML =
        '<p class="text-center">Please log in to view movies.</p>';
      return;
    }
    targetList.innerHTML = "";
    movies.forEach((movie, index) => {
      const card = document.createElement("div");
      card.className = "col-md-4 mb-4 movie-card-wrapper";
      card.style.opacity = "0";
      card.innerHTML = `
        <div class="card movie-card ultra-card" data-movie-id="${movie.id}">
          <img src="https://image.tmdb.org/t/p/w500/${
            movie.poster_path
          }" alt="${
        movie.title
      }" class="progressive-load lazy-load" data-src="https://image.tmdb.org/t/p/w500/${
        movie.poster_path
      }" />
          <div class="card-body">
            <h5 class="card-title neon-text">${movie.title}</h5>
            <p class="card-text">${movie.overview.substring(0, 50)}...</p>
            <p><strong>Rating:</strong> ${movie.rating}</p>
            <button class="btn btn-sm btn-warning neon-btn" onclick="addToFavorites(${
              movie.id
            }, event)">
              <i class="fas fa-heart"></i> Add to Favorites
            </button>
            <button class="btn btn-sm btn-secondary mt-2" onclick="markAsWatched(${
              movie.id
            }, event)">
              <i class="fas fa-eye"></i> Watched
            </button>
          </div>
        </div>
      `;
      card
        .querySelector(".movie-card")
        .addEventListener("click", () => viewDetails(movie.id));
      card.addEventListener("mousemove", (e) => eyeTrackingNavigation(e, card));
      targetList.appendChild(card);
      setTimeout(() => {
        card.style.transition = "opacity 0.5s ease";
        card.style.opacity = "1";
      }, index * 100);
    });
    lazyLoadImages();
  }

  window.addToFavorites = function (movieId, event) {
    event.stopPropagation();
    const movie = moviesData.find((m) => m.id === movieId);
    if (!favorites.some((fav) => fav.id === movie.id)) {
      favorites.push(movie);
      localStorage.setItem("favorites", JSON.stringify(favorites));
      points += 10;
      localStorage.setItem("points", points);
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "Added!",
          text: `${movie.title} added to favorites. +10 points!`,
        });
      }
      updatePointsDisplay();
      updateLiveStats();
      if (favoritesList) displayFavorites();
    } else {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "Already Added!",
          text: `${movie.title} is already in favorites.`,
        });
      }
    }
  };

  window.removeFromFavorites = function (movieId) {
    favorites = favorites.filter((fav) => fav.id !== movieId);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    displayFavorites();
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: "Removed!",
        text: "Movie removed from favorites.",
      });
    }
    updateLiveStats();
  };

  window.markAsWatched = function (movieId, event) {
    if (event) event.stopPropagation();
    const movie = moviesData.find((m) => m.id === movieId);
    if (!watched.some((w) => w.id === movie.id)) {
      watched.push(movie);
      localStorage.setItem("watched", JSON.stringify(watched));
      points += 5;
      localStorage.setItem("points", points);
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "Watched!",
          text: `${movie.title} added to watched. +5 points!`,
        });
      }
      updatePointsDisplay();
      updateLiveStats();
    } else {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "Already Watched!",
          text: `${movie.title} is already watched.`,
        });
      }
    }
  };

  function displayFavorites() {
    if (!favoritesList) return;
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<p class="text-center">No favorites yet.</p>';
    } else {
      favoritesList.innerHTML = "";
      favorites.forEach((movie) => {
        const card = document.createElement("div");
        card.className = "col-md-4 mb-4 movie-card-wrapper";
        card.innerHTML = `
          <div class="card movie-card ultra-card">
            <img src="https://image.tmdb.org/t/p/w500/${
              movie.poster_path
            }" alt="${
          movie.title
        }" class="lazy-load" data-src="https://image.tmdb.org/t/p/w500/${
          movie.poster_path
        }" />
            <div class="card-body">
              <h5 class="card-title neon-text">${movie.title}</h5>
              <p class="card-text">${movie.overview.substring(0, 50)}...</p>
              <p><strong>Rating:</strong> ${movie.rating}</p>
              <button class="btn btn-sm btn-danger neon-btn" onclick="removeFromFavorites(${
                movie.id
              })">
                <i class="fas fa-trash"></i> Remove
              </button>
            </div>
          </div>
        `;
        card
          .querySelector(".movie-card")
          .addEventListener("click", () => viewDetails(movie.id));
        favoritesList.appendChild(card);
      });
    }
    updateLiveStats();
    lazyLoadImages();
  }

  function displayWatched() {
    if (!watchedList) return;
    if (watched.length === 0) {
      watchedList.innerHTML =
        '<p class="text-center">No watched movies yet.</p>';
      return;
    }
    watchedList.innerHTML = "";
    watched.forEach((movie) => {
      const card = document.createElement("div");
      card.className = "col-md-4 mb-4 movie-card-wrapper";
      card.innerHTML = `
        <div class="card movie-card ultra-card">
          <img src="https://image.tmdb.org/t/p/w500/${
            movie.poster_path
          }" alt="${
        movie.title
      }" class="lazy-load" data-src="https://image.tmdb.org/t/p/w500/${
        movie.poster_path
      }" />
          <div class="card-body">
            <h5 class="card-title neon-text">${movie.title}</h5>
            <p class="card-text">${movie.overview.substring(0, 50)}...</p>
            <p><strong>Rating:</strong> ${movie.rating}</p>
          </div>
        </div>
      `;
      card
        .querySelector(".movie-card")
        .addEventListener("click", () => viewDetails(movie.id));
      watchedList.appendChild(card);
    });
    lazyLoadImages();
  }

  function updateLiveStats() {
    const statsDiv = document.getElementById("favoritesStats");
    if (!statsDiv) return;
    const totalFavorites = favorites.length;
    const totalWatched = watched.length;
    const avgRating =
      favorites.reduce((sum, movie) => sum + movie.rating, 0) /
        totalFavorites || 0;
    const genreCount = {};
    favorites.forEach((movie) => {
      movie.genre.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });
    const favoriteGenre = Object.entries(genreCount).sort(
      (a, b) => b[1] - a[1]
    )[0];
    statsDiv.innerHTML = `
      <p><strong>Total Favorites:</strong> ${totalFavorites}</p>
      <p><strong>Total Watched:</strong> ${totalWatched}</p>
      <p><strong>Average Rating:</strong> ${avgRating.toFixed(2)}</p>
      <p><strong>Favorite Genre:</strong> ${getGenreName(
        favoriteGenre ? favoriteGenre[0] : "N/A"
      )}</p>
    `;
  }

  function getGenreName(genreId) {
    const genres = {
      28: "Action",
      18: "Drama",
      35: "Comedy",
      12: "Adventure",
      878: "Science Fiction",
    };
    return genres[genreId] || "Unknown";
  }

  window.viewDetails = function (movieId) {
    localStorage.setItem("selectedMovieId", movieId);
    window.location.href = "movie-details.html";
  };

  function loadMovieDetails() {
    const movieDetails = document.getElementById("movieDetails");
    if (!movieDetails) return;
    const movieId = localStorage.getItem("selectedMovieId");
    if (!movieId) {
      movieDetails.innerHTML = '<p class="text-center">No movie selected.</p>';
      return;
    }
    fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?language=en-US&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((movie) => {
        movieDetails.innerHTML = `
          <h2 class="neon-text ultra-title">${movie.title}</h2>
          <img src="https://image.tmdb.org/t/p/w500/${
            movie.poster_path
          }" alt="${
          movie.title
        }" class="img-fluid mb-3 progressive-load lazy-load" data-src="https://image.tmdb.org/t/p/w500/${
          movie.poster_path
        }" />
          <p><strong>Overview:</strong> ${movie.overview}</p>
          <p><strong>Rating:</strong> ${movie.vote_average}</p>
          <p><strong>Release Date:</strong> ${movie.release_date}</p>
          <p><strong>Genres:</strong> ${movie.genres
            .map((g) => g.name)
            .join(", ")}</p>
        `;
        const storedRating = localStorage.getItem(`rating_${movieId}`);
        if (storedRating) {
          document.getElementById("personalRating").value = storedRating;
          document.getElementById(
            "ratingMessage"
          ).textContent = `Your Rating: ${storedRating}`;
        }
        const storedNotes = localStorage.getItem(`notes_${movieId}`);
        if (storedNotes) {
          document.getElementById("notesInput").value = storedNotes;
          document.getElementById("notesDisplay").textContent = storedNotes;
        }
        loadComments(movieId);
        loadReviews(movieId);
        loadExpandedProfile(movie);
        loadCast(movieId);
        setVideoBackground(movie.backdrop_path);
        lazyLoadImages();
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        movieDetails.innerHTML =
          '<p class="text-center">Failed to load movie details.</p>';
      });
  }

  function loadCast(movieId) {
    const castList = document.getElementById("castList");
    if (!castList) return;
    fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?language=en-US&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        const mainCast = data.cast.slice(0, 5); // Top 5 actors
        localStorage.setItem(`cast_${movieId}`, JSON.stringify(mainCast));
        castList.innerHTML =
          "<h5>Main Cast</h5><div class='cast-list'>" +
          mainCast
            .map(
              (actor) => `
            <div class="cast-item">
              <img src="https://image.tmdb.org/t/p/w200${
                actor.profile_path || "/default_actor.jpg"
              }" alt="${actor.name}" />
              <p>${actor.name} as ${actor.character}</p>
            </div>
          `
            )
            .join("") +
          "</div>";
      })
      .catch((err) => {
        console.error("Fetch Cast Error:", err);
        castList.innerHTML = "<p>Failed to load cast.</p>";
      });
  }

  function loadExpandedProfile(movie) {
    const expandedProfile = document.getElementById("expandedProfile");
    if (!expandedProfile) return;
    expandedProfile.innerHTML = `
      <p><strong>Budget:</strong> $${
        movie.budget ? movie.budget.toLocaleString() : "N/A"
      }</p>
      <p><strong>Revenue:</strong> $${
        movie.revenue ? movie.revenue.toLocaleString() : "N/A"
      }</p>
      <p><strong>Runtime:</strong> ${
        movie.runtime ? movie.runtime + " minutes" : "N/A"
      }</p>
      <p><strong>Production Companies:</strong> ${
        movie.production_companies?.map((c) => c.name).join(", ") || "N/A"
      }</p>
    `;
  }

  window.watchTrailer = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const trailerPlayer = document.getElementById("trailerPlayer");
    fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/videos?language=en-US&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        const trailer = data.results.find((video) => video.type === "Trailer");
        if (trailer) {
          trailerPlayer.innerHTML = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`;
          trailerPlayer.style.display = "block";
        }
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
      });
  };

  window.shareMovie = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const movie = moviesData.find((m) => m.id === parseInt(movieId));
    const url = `${window.location.origin}/movie-details.html?movieId=${movieId}`;
    const text = `Check out "${movie.title}" on Movies & Series!`;
    if (navigator.share) {
      navigator.share({ title: movie.title, text: text, url: url });
    } else {
      const shareLink = `<a href="${url}" target="_blank">${text}</a>`;
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "info",
          title: "Share Link",
          html: shareLink,
        });
      }
    }
  };

  window.startWatchParty = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const partyLink = `${
      window.location.origin
    }/movie-details.html?movieId=${movieId}&party=${Date.now()}`;
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: "Watch Party Started!",
        html: `Share this link: <a href="${partyLink}" target="_blank">${partyLink}</a>`,
      });
    }
  };

  window.toggleCinemaMode = function () {
    document.body.classList.toggle("cinema-mode");
    const trailerPlayer = document.getElementById("trailerPlayer");
    if (
      document.body.classList.contains("cinema-mode") &&
      trailerPlayer.style.display === "none"
    ) {
      watchTrailer();
      document
        .querySelectorAll(".container > *:not(#movieDetails, #trailerPlayer)")
        .forEach((el) => (el.style.opacity = "0.3"));
    } else {
      trailerPlayer.style.display = "none";
      trailerPlayer.innerHTML = "";
      document
        .querySelectorAll(".container > *")
        .forEach((el) => (el.style.opacity = "1"));
    }
  };

  window.showMovieSchedule = function () {
    fetch(
      `https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        let html = "<h3>Upcoming Movies</h3><ul>";
        data.results.slice(0, 5).forEach((movie) => {
          html += `<li>${movie.title} - ${movie.release_date} <button class="btn btn-sm btn-primary" onclick="addToReminders('${movie.id}', '${movie.release_date}')">Remind Me</button></li>`;
        });
        html += "</ul>";
        if (typeof Swal !== "undefined") {
          Swal.fire({
            title: "Movie Schedule",
            html: html,
            width: 600,
          });
        }
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
      });
  };

  window.addToReminders = function (movieId, releaseDate) {
    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    if (!reminders.some((r) => r.movieId === movieId)) {
      reminders.push({ movieId, releaseDate });
      localStorage.setItem("reminders", JSON.stringify(reminders));
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "Reminder Set!",
          text: `Reminder set for ${releaseDate}.`,
        });
      }
    } else {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "Already Set!",
          text: "Reminder already set for this movie.",
        });
      }
    }
  };

  window.savePersonalRating = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const rating = document.getElementById("personalRating").value;
    if (rating < 0 || rating > 10) {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "error",
          title: "Invalid Rating!",
          text: "Rating must be between 0 and 10.",
        });
      }
      return;
    }
    localStorage.setItem(`rating_${movieId}`, rating);
    document.getElementById(
      "ratingMessage"
    ).textContent = `Your Rating: ${rating}`;
  };

  window.saveComment = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const comment = document.getElementById("commentInput").value;
    if (!comment) {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "error",
          title: "Empty Comment!",
          text: "Please write a comment.",
        });
      }
      return;
    }
    let comments =
      JSON.parse(localStorage.getItem(`comments_${movieId}`)) || [];
    comments.push({ text: comment, date: new Date().toLocaleString() });
    localStorage.setItem(`comments_${movieId}`, JSON.stringify(comments));
    document.getElementById("commentInput").value = "";
    loadComments(movieId);
  };

  window.saveReview = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const reviewText = document.getElementById("reviewInput").value;
    const reviewStars = document.getElementById("reviewStars").value;
    if (!reviewText) {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "error",
          title: "Empty Review!",
          text: "Please write a review.",
        });
      }
      return;
    }
    let reviews = JSON.parse(localStorage.getItem(`reviews_${movieId}`)) || [];
    reviews.push({
      text: reviewText,
      stars: reviewStars,
      date: new Date().toLocaleString(),
      user: localStorage.getItem("loggedInEmail"),
    });
    localStorage.setItem(`reviews_${movieId}`, JSON.stringify(reviews));
    document.getElementById("reviewInput").value = "";
    loadReviews(movieId);
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: "Review Submitted!",
        text: "Your review has been added.",
      });
    }
  };

  function loadReviews(movieId) {
    const reviewsList = document.getElementById("reviewsList");
    if (!reviewsList) return;
    const reviews =
      JSON.parse(localStorage.getItem(`reviews_${movieId}`)) || [];
    reviewsList.innerHTML = "";
    reviews.forEach((review) => {
      const div = document.createElement("div");
      div.className = "border-bottom py-2 neon-text";
      div.innerHTML = `
        <p>${review.text} (${review.stars} <i class="fas fa-star"></i>) <small class="text-muted">(${review.date} - ${review.user})</small></p>
      `;
      reviewsList.appendChild(div);
    });
  }

  window.saveNotes = function () {
    const movieId = localStorage.getItem("selectedMovieId");
    const notes = document.getElementById("notesInput").value;
    localStorage.setItem(`notes_${movieId}`, notes);
    document.getElementById("notesDisplay").textContent = notes;
  };

  function loadComments(movieId) {
    const commentsList = document.getElementById("commentsList");
    if (!commentsList) return;
    const comments =
      JSON.parse(localStorage.getItem(`comments_${movieId}`)) || [];
    commentsList.innerHTML = "";
    comments.forEach((comment) => {
      const div = document.createElement("div");
      div.className = "border-bottom py-2 neon-text";
      div.innerHTML = `<p>${comment.text} <small class="text-muted">(${comment.date})</small></p>`;
      commentsList.appendChild(div);
    });
  }

  window.changeBackground = function () {
    const randomMovie =
      moviesData[Math.floor(Math.random() * moviesData.length)];
    document.body.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${randomMovie.poster_path})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    generateDynamicTheme(randomMovie.poster_path);
  };

  function setVideoBackground(backdropPath) {
    document.body.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${backdropPath})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }

  window.showRecommendations = function () {
    const preferredGenres = {};
    favorites.forEach((movie) => {
      movie.genre.forEach((g) => {
        preferredGenres[g] = (preferredGenres[g] || 0) + 1;
      });
    });
    const topGenre = Object.entries(preferredGenres).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const recommendations = moviesData
      .filter(
        (movie) =>
          !favorites.some((f) => f.id === movie.id) &&
          movie.genre.includes(parseInt(topGenre[0]))
      )
      .slice(0, 3);
    let html = "<h3>Recommended Movies:</h3><ul>";
    recommendations.forEach((movie) => {
      html += `<li><a href="#" onclick="viewDetails(${movie.id}); return false;">${movie.title}</a></li>`;
    });
    html += "</ul>";
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "info",
        title: "Recommendations",
        html: html,
      });
    }
  };

  window.createAutoPlaylist = function () {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "Create Auto Playlist",
        html: `
          <select id="playlistGenre" class="form-select mb-2">
            <option value="">Select Genre</option>
            <option value="28">Action</option>
            <option value="18">Drama</option>
            <option value="35">Comedy</option>
            <option value="12">Adventure</option>
            <option value="878">Science Fiction</option>
          </select>
          <input id="playlistYear" type="number" class="form-control mb-2" placeholder="Year" min="1900" max="2025">
          <input id="playlistRating" type="number" class="form-control" placeholder="Min Rating (0-10)" min="0" max="10">
        `,
        showCancelButton: true,
        confirmButtonText: "Generate",
      }).then((result) => {
        if (result.isConfirmed) {
          const genre = document.getElementById("playlistGenre").value;
          const year = document.getElementById("playlistYear").value;
          const minRating =
            parseFloat(document.getElementById("playlistRating").value) || 0;
          let filteredMovies = moviesData
            .filter((movie) => {
              return (
                (!genre || movie.genre.includes(parseInt(genre))) &&
                (!year || movie.release_date.startsWith(year)) &&
                movie.rating >= minRating
              );
            })
            .slice(0, 5);
          let html = "<h3>Your Playlist:</h3><ul>";
          filteredMovies.forEach((movie) => {
            html += `<li>${movie.title} (Rating: ${movie.rating})</li>`;
          });
          html +=
            "</ul><button onclick='savePlaylist(this.previousElementSibling)'>Save Playlist</button>";
          Swal.fire({
            icon: "success",
            title: "Playlist Generated!",
            html: html,
          });
        }
      });
    }
  };

  window.savePlaylist = function (playlistElement) {
    const playlist = Array.from(playlistElement.children).map(
      (li) => li.textContent
    );
    localStorage.setItem("autoPlaylist", JSON.stringify(playlist));
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: "Playlist Saved!",
        text: "Your playlist has been saved.",
      });
    }
  };

  function loadNewsFeed() {
    const newsFeed = document.getElementById("newsFeed");
    if (!newsFeed) return;
    fetch(
      "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c",
      options
    )
      .then((res) => res.json())
      .then((data) => {
        let html = "<ul>";
        data.results.slice(0, 5).forEach((movie) => {
          html += `<li>${movie.title} is now playing in theaters!</li>`;
        });
        html += "</ul>";
        newsFeed.innerHTML = html;
      })
      .catch((err) => {
        newsFeed.innerHTML = "<p>Failed to load news feed.</p>";
      });
  }

  window.redeemPoints = function () {
    if (points >= 50) {
      points -= 50;
      localStorage.setItem("points", points);
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "Points Redeemed!",
          text: "You unlocked a new background!",
        });
      }
      updatePointsDisplay();
    } else {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "Not Enough Points!",
          text: "You need 50 points to redeem.",
        });
      }
    }
  };

  window.exportFavorites = function () {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(favorites));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "favorites.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Favorites exported successfully!", "success");
  };

  window.importFavorites = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const importedFavorites = JSON.parse(e.target.result);
      importedFavorites.forEach((movie) => {
        if (!favorites.some((f) => f.id === movie.id)) {
          favorites.push(movie);
          points += 5;
        }
      });
      localStorage.setItem("favorites", JSON.stringify(favorites));
      localStorage.setItem("points", points);
      displayFavorites();
      updatePointsDisplay();
      showNotification("Favorites imported successfully!", "success");
    };
    reader.readAsText(file);
  };

  function updatePointsDisplay() {
    const pointsDisplay = document.getElementById("points");
    if (pointsDisplay) pointsDisplay.textContent = points;
  }

  function showNotification(message, type) {
    const notificationBar = document.getElementById("notificationBar");
    if (!notificationBar) return;
    const notificationMessage = document.getElementById("notificationMessage");
    notificationMessage.textContent = message;
    notificationBar.className = `notification-bar ${type}`;
    notificationBar.style.display = "flex";
    setTimeout(hideNotification, 3000);
  }

  window.hideNotification = function () {
    const notificationBar = document.getElementById("notificationBar");
    if (notificationBar) notificationBar.style.display = "none";
  };

  function startActiveTimeCounter() {
    const activeTimeDisplay = document.getElementById("activeTime");
    if (!activeTimeDisplay) return;
    setInterval(() => {
      activeTime++;
      const minutes = Math.floor(activeTime / 60);
      const seconds = activeTime % 60;
      activeTimeDisplay.textContent = `${minutes}:${
        seconds < 10 ? "0" : ""
      }${seconds}`;
    }, 1000);
  }

  function loadProfile() {
    const profileEmail = document.getElementById("profileEmail");
    if (!profileEmail) return;
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const loggedInUser = users.find(
      (u) => u.email === localStorage.getItem("loggedInEmail")
    );
    if (loggedInUser) {
      profileEmail.textContent = loggedInUser.email;
      localStorage.setItem("loggedInEmail", loggedInUser.email);
    }
    const profilePic = localStorage.getItem("profilePic");
    if (profilePic) document.getElementById("profilePic").src = profilePic;
    updatePersonalStats();
  }

  function updatePersonalStats() {
    const statsDiv = document.getElementById("personalStats");
    if (!statsDiv) return;
    const thisMonthWatched = watched.filter(
      (w) => new Date(w.release_date).getMonth() === new Date().getMonth()
    ).length;
    const totalWatched = watched.length;
    const genreCount = {};
    watched.forEach((movie) => {
      movie.genre.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });
    const favoriteGenre = Object.entries(genreCount).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const avgRating =
      watched.reduce((sum, movie) => sum + movie.rating, 0) / totalWatched || 0;
    statsDiv.innerHTML = `
      <p><strong>Watched This Month:</strong> ${thisMonthWatched}</p>
      <p><strong>Total Watched:</strong> ${totalWatched}</p>
      <p><strong>Favorite Genre:</strong> ${getGenreName(
        favoriteGenre ? favoriteGenre[0] : "N/A"
      )}</p>
      <p><strong>Average Rating:</strong> ${avgRating.toFixed(2)}</p>
    `;
  }

  window.updateProfilePic = function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
      const imgData = e.target.result;
      localStorage.setItem("profilePic", imgData);
      document.getElementById("profilePic").src = imgData;
    };
    reader.readAsDataURL(file);
  };

  window.changeFontSize = function (size) {
    localStorage.setItem("fontSize", size);
    document.body.style.fontSize = `${size}px`;
  };

  function progressiveLoadImages() {
    const images = document.querySelectorAll(".progressive-load");
    images.forEach((img) => {
      img.style.opacity = "0";
      img.onload = () => {
        img.style.transition = "opacity 0.5s ease";
        img.style.opacity = "1";
      };
    });
  }

  function lazyLoadImages() {
    const lazyImages = document.querySelectorAll(".lazy-load");
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove("lazy-load");
          observer.unobserve(img);
        }
      });
    });
    lazyImages.forEach((img) => observer.observe(img));
  }

  function eyeTrackingNavigation(event, element) {
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    element.style.transform = `translateY(-10px) rotateX(${
      y * 10
    }deg) rotateY(${x * 10}deg)`;
  }

  function generateDynamicTheme(posterPath) {
    const img = new Image();
    img.src = `https://image.tmdb.org/t/p/w500${posterPath}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
      document.documentElement.style.setProperty(
        "--dynamic-theme-color",
        color
      );
    };
  }

  function setupSignUpForm() {
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        if (users.some((user) => user.email === email)) {
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "Error!",
              text: "Email already exists!",
            });
          }
          return;
        }
        users.push({ email, password });
        localStorage.setItem("users", JSON.stringify(users));
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "success",
            title: "Success!",
            text: "Sign up successful! Please log in.",
          }).then(() => {
            window.location.href = "login.html";
          });
        } else {
          window.location.href = "login.html";
        }
      });
    }
  }

  function setupLoginForm() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const user = users.find(
          (u) => u.email === email && u.password === password
        );
        if (user) {
          localStorage.setItem("loggedIn", "true");
          localStorage.setItem("loggedInEmail", email);
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "success",
              title: "Success!",
              text: "Login successful!",
            }).then(() => {
              window.location.href = "index.html";
            });
          } else {
            window.location.href = "index.html";
          }
        } else {
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "Error!",
              text: "Invalid email or password!",
            });
          }
        }
      });
    }
  }

  window.addEventListener("scroll", () => {
    const scrollPosition = window.scrollY;
    document.body.style.backgroundPositionY = `${scrollPosition * 0.5}px`;
  });
});
