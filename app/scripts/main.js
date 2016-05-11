var accessToken, sessionUser, sessionPlaylist;
var spotifyApi = new SpotifyWebApi();
var currentSong = {};
var songList = [];
var songListLookup = {};
var spotify;
var ctx; var radarData; var myRadarChart; 
var datasetIndex = 0;
var traits = ["tempo", "acousticness", "danceability", "energy", "happiness"];

var quizProgress = -1;
var quizQuestions = [];
var quizResults = {limit: 5};
var QUESTION_CONTAINER = 'question-container';

// The quiz doesn't do anything right now
// TODO[tricia]: actually implement the quiz.
var startQuiz = function() {
  $('#login-container').hide();
  nextQuizQuestion();

};

// questionText is a string
// questionList is an array of dicts {text: , val: }
// questionClass is a string to use as a jQuery identifier for the questions
var makeQuizHtml = function(questionText, questionList, questionClass, id, extra) {
  id = id || '';
  extra = extra || '';
  var text = '<div class="'+QUESTION_CONTAINER+'" id="'+id+'">';
  text +='<h2 class="question-text">'+questionText+'</h2>';
  text += '<div class="main">';
  for (var i=0; i<questionList.length; i++) {
    text += '<div class="'+questionClass+' quiz-answer" data-value='+questionList[i].val+'>'+questionList[i].text+'</div>'
  }
  text += '</div>';
  text += extra;
  text += '</div>'; //end question-container
  return text;
}

var makeQuizInput = function(questionText, inputLabel, numLabels, questionClass, id, extra) {
  id = id || '';
  extra = extra || '';  
  var text = '<div class="'+QUESTION_CONTAINER+'" id="'+id+'">';
  text +='<h2 class="question-text">'+questionText+'</h2>';
  text += '<div class="main">';

  for (var i=0; i<numLabels; i++) {
    text += '<input type="text" class="'+questionClass+' quiz-answer" placeholder="'+inputLabel+'"></input>';
  }
  text += '<button class="btn '+questionClass+'">Next</button>';
  text += '</div>';
  text += extra;
  text += '</div>'; //end question-container
  return text;
}

var nextQuizQuestion = function() {
  quizProgress += 1;
  if (quizProgress > 0) {
    $('.'+QUESTION_CONTAINER).remove();
  }

  if (quizProgress < quizQuestions.length) {
    quizQuestions[quizProgress]();
  } 
  else {
    finishQuiz(); 
  }
}

var finishQuiz = function() {
  spotifyApi.getRecommendations(quizResults, processQuiz);
  initializeGraphics();

}

var processQuiz = function(err, data) {
  songList = data.tracks;

  for (var i = 0; i < data.tracks.length; i++) {
    var newsong = data.tracks[i];
    var artists = [];
    for (var j = 0; j < newsong.artists.length; j++) {
      artists.push(newsong.artists[j].name);
    }
    addSongGraphic(newsong.id, newsong.album.images[1].url, newsong.preview_url, newsong.name, artists.join(', '));
  }


  $.each(songList, function(){
    this.song_id = this.id;
    this.id = 'spotify:track:'+this.id;
    songListLookup[this.id] = this;
  });
  setUpExploration();
}

var quizValence = function() {
  var questionText = "How are you feeling?";
  var questionList = [
    {text: 'morose', val: 0},
    {text: 'sad', val: 0.25},
    {text: 'content', val: 0.50},
    {text: 'happy', val: 0.75},
    {text: 'ecstatic', val: 1.0}
  ];
  var questionClass = 'valence-quiz-answer';
  $('body').append(makeQuizHtml(questionText, questionList, questionClass));
  $('.'+questionClass).on('click', function(e) {
    e.preventDefault();
    quizResults.target_valence = $(e.target).attr('data-value');
    nextQuizQuestion();
  });
}

var quizDanceability = function() {
  var questionText = "Do you want to dance?";
  var questionList = [
    {text: 'NO.', val: 0},
    {text: 'nah.', val: 0.25},
    {text: 'maybe...', val: 0.50},
    {text: 'yes!', val: 0.75},
    {text: 'all night long!', val: 1.0}
  ];
  var questionClass = 'danceability-quiz-answer';
  $('body').append(makeQuizHtml(questionText, questionList, questionClass));
  $('.'+questionClass).on('click', function(e) {
    e.preventDefault();
    quizResults.target_danceability = $(e.target).attr('data-value');
    nextQuizQuestion();
  });
}

var quizAcousticness = function() {
  var questionText = "Do you want to sing along?";
  var questionList = [
    {text: 'no words is best.', val: 1.0},
    {text: 'I don\'t sing', val: 0.7},
    {text: 'if I know the words', val: 0.50},
    {text: 'For sure!', val: 0.1},
    {text: 'I\'m ready to sing my heart out!', val: 0.0}
  ];
  var questionClass = 'acousticness-quiz-answer';
  $('body').append(makeQuizHtml(questionText, questionList, questionClass));
  $('.'+questionClass).on('click', function(e) {
    e.preventDefault();
    quizResults.target_acousticness = $(e.target).attr('data-value');
    nextQuizQuestion();
  });
}

var quizSeeds = function() {
  // genres
  spotifyApi.getAvailableGenreSeeds(finishSeeds);
}

var finishSeeds = function(err, data) {
  // genres
  var questionText1 = "choose a genre to explore";
  var questionList1 = data.genres.map(function(obj) {
    return {text: obj, val: obj};
  });
  var questionClass1 = 'genre-quiz-answer';
  $('body').append(makeQuizHtml(questionText1, questionList1, questionClass1, 
      'genre-seed'));
  $('.'+questionClass1).on('click', function(e) {
    e.preventDefault();
    quizResults.seed_genres = [$(e.target).attr('data-value')];
    nextQuizQuestion();
  });
  $('.' + QUESTION_CONTAINER + ' .main').css('max-height', 'calc(100vh - 133px)');  
  $('.' + QUESTION_CONTAINER + ' .main').css('overflow-y', 'auto');
}

quizQuestions.push(quizValence);
quizQuestions.push(quizDanceability);
quizQuestions.push(quizAcousticness);
quizQuestions.push(quizSeeds);

// After the quiz, we set up the scene
var setUpExploration = function() {
    $('#finish-quiz').hide();

    currentSong.id = songList[songList.length-1].id.split(':')[2];
    spotifyApi.getAudioFeaturesForTrack(currentSong.id, setUpSongFeatures);
    $('body').append('<button id="save-to-playlist-btn">Save Playlist</button>');
    $('#save-to-playlist-btn').on('click', function(e){
      if (sessionPlaylist) {
        replaceTracks();
      } else {
        spotifyApi.createPlaylist(sessionUser.id, {name: 'Playlist Explorer'}, playlistCall);
      }   
    });
}

// this just updates the fields visually
// [TODO]: make this do cool things
var addNewSongsToList = function(err, data) {
  if (data) {
    var temp1 = data.tracks;
    $.each(temp1, function(){
      this.song_id = this.id;
      this.id = 'spotify:track:'+this.id;
    });
    // console.log(data);
    // if ($('#song-suggestions #group-'+datasetIndex).length == 0) {
    //   $('#song-suggestions').prepend('<div class="suggestion-group" id="group-'+datasetIndex+'"></div>');
    //   $('#song-suggestions #group-'+datasetIndex).prepend("<h1>Songs generated by " + currentSong.info.name + "</h1>")
    // }
    for (var i = 0; i < temp1.length; i++) {
      if (!songListLookup.hasOwnProperty(temp1[i].id)) {
        songListLookup[temp1[i].id] = temp1[i];
        songList.push(temp1[i]);

        var newsong = temp1[i];
        var artists = [];
        for (var j = 0; j < newsong.artists.length; j++) {
          artists.push(newsong.artists[j].name);
        }

        // $('#song-suggestions #group-'+datasetIndex).append('<div class="suggestion '+newsong.song_id+'">'
        //   +'<h3>'+newsong.name+'</h3>'
        //   +'<h4>'+artists.join(', ')+' on '+newsong.album.name+'</h4>'
        //   +'<button class="preview-btn" onclick="makeiframe(\''+newsong.preview_url+'\',\''+newsong.song_id+'\')">Preview</button>'
        //   +'<button class="playlist-btn" onclick="addToPlaylist(\''+newsong.id+'\')">Add to Playlist</button>'
        //   +'<button class="explore-btn" onclick="exploreSong(\''+newsong.id+'\')">Explore This Song</button>'
        //   +'</div>');

        addSongGraphic(newsong.song_id, newsong.album.images[1].url, newsong.preview_url, newsong.name, artists.join(', '));
        render();
      }
    }
  }
}

// saves the song features, then grabs song info
// song features are things like danceability, valence (happiness), etc.
var setUpSongFeatures = function(err, data) {
  if (data) {
    currentSong.features = data;
  }

  spotifyApi.getTrack(currentSong.id, setUpSongInfo);
}

// gets the current song's features, then look for song info
var updateSongFeatures = function(err, data) {
  if (data) {
    currentSong.features = data;
  }

  spotifyApi.getTrack(currentSong.id, updateSongInfo);
}

// saves song info then calls to update visuals
// song info is like album, artist, etc.
var setUpSongInfo = function(err, data) {
  if (data) {
    currentSong.info = data;
  }

  initGUI();
}

// gets the song info, the look to update text and graph visuals
var updateSongInfo = function(err, data) {
  // save the current song's graph before resetting
  currentSong.info = data;

  //updateVisualInfo();

  updateGUI();
}

// this looks up the new song
// [TODO:] add callback and hook up to graphics,
// this is when we walk down a new path
var exploreSong = function(id) {
  currentSong.id = id;
  spotifyApi.getAudioFeaturesForTrack(currentSong.id, updateSongFeatures);
}

var playlistCall = function(err, data) {
  if (data) {
    sessionPlaylist = data;
    replaceTracks();
  }
}

var replaceTracks = function() {
  songuris = [];
  for (var key in songs_info) {
    if (songs_info.hasOwnProperty(key) && songs_info[key][3]) {
      songuris.push('spotify:track:' + songs_info[key][0]);
    }
  }
  spotifyApi.replaceTracksInPlaylist(sessionUser.id, sessionPlaylist.id, songuris, finishSave);
}

var finishSave = function(err, data) {
  if (err) {
    console.log(err);
  } else {
    toastr.success('Success!', 'Successfully saved playlist. Please check your Spotify!', {timeOut: 5000})
  }
}


var initializeGraphics = function() {

  renderer.setSize( WIDTH, HEIGHT );
  $('#song-suggestions').append( renderer.domElement );

  initScene();
  render();

}

var generateSongRecommendations = function() {
    var NUM_SONG_REQS = 5;
    var NUM_SONG_SEEDS = 5;
    var seeds = [];

    // first add songs that you accepted
    for (var i = songList.length-1; i >= 0; i--) {
      var obj = songList[i];
      if (songs_info.hasOwnProperty[obj.id] && songs_info[obj.id][3]) {
        seeds.push(obj.id.split(':')[2]);
        if (seeds.length >= NUM_SONG_SEEDS) {
          break;
        }
      }
    }

    if (seeds.length < NUM_SONG_SEEDS) {
    // then add songs that you didn't reject
      for (var i = songList.length-1; i >= 0; i--) {
        var obj = songList[i];
        if (songs_info.hasOwnProperty[obj.id] && songs_info[obj.id][3] != false) {
          seeds.push(obj.id.split(':')[2]);
          if (seeds.length >= NUM_SONG_SEEDS) {
            break;
          }
        }
      }        
    }

    // then just add the last song if they were all rejected?
    if (seeds.length <= 0) {
      seeds.push(songList[songList.length-1].id.split(':')[2]);
    }

    var rec_data = {seed_tracks: seeds, limit: NUM_SONG_REQS};
    // tempo isn't normalized but everything else is
    rec_data["target_tempo"] = songAttributeText['tempo'];
    rec_data["target_acousticness"] = songAttributeText['acousticness']/100;
    rec_data["target_danceability"] = songAttributeText['danceability']/100;
    rec_data["target_energy"] = songAttributeText['energy']/100;
    rec_data["target_valence"] = songAttributeText['happiness']/100;

    spotifyApi.getRecommendations(rec_data, addNewSongsToList);
}

$(document).on('ready', function(){

  $('#login-container').append('<button id="login-btn" class="btn login-button">LOGIN WITH SPOTIFY</button>');

  $('#login-btn').on('click', function(e) {
    e.preventDefault();
    OAuth.initialize('OfmhIjdpngci5YQdAoIrKMMGB6E');
    OAuth.popup('spotify', {cache: false, authorize: {scope: "playlist-modify-public", response_type: "token", state: Math.random()}}).done(function(result) {
      accessToken = result.access_token;
      result.me().done(function(response) {
        sessionUser = response;
        spotifyApi.setAccessToken(accessToken);
        $('#login-btn').hide();
      });
    });

    spotify = OAuth.create('spotify');
    startQuiz();
  });  
});