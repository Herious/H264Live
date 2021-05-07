
var FSDrawCanvas = {
  LineWidth : 2,
  FRStrokeStyle : "#00FF99",
  FTStrokeStyle : "#ff0000",
  FRList : [],

	CanvasDrawRects: function(canvas, rects, fascale) {
		for(var r in rects){  
      var ftFaceId = rects[r].face_id;
      var context = canvas.getContext("2d"); 　
      context.lineWidth = this.LineWidth;
      context.strokeStyle = this.FRList.indexOf(ftFaceId) > -1 ? this.FRStrokeStyle : this.FTStrokeStyle;
      context.strokeRect(parseInt(rects[r].x * fascale), parseInt(rects[r].y * fascale), parseInt(rects[r].width * fascale), parseInt(rects[r].height * fascale))
    }			
    // console.log('show rects time:' + new Date().getTime())
	},
	
	CanvasDrawWords: function(canvas, words) {

    if (words.length == 0) {
      return
    }

    for(var w in words){
      var context = canvas.getContext("2d"); 
      var platename = words[w].platename;
      var gradient = context.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop("0", "#00FF99");
      context.fillStyle = gradient;
      context.font="80px Verdana";
      context.fillText(platename, 50, canvas.height - (100 * (parseInt(w) + 1)));
    }
	},
	
	CanvasClear: function(canvas) {
		var context = canvas.getContext("2d");
		context.clearRect(0, 0, canvas.width, canvas.height); 
  },

  FaceRecognition: function(faces) {
    console.log(faces);
    for (var f in faces) {
      var faceID = faces[f].face_id;
      var frIndex = this.FRList.indexOf(faceID)
      frIndex != -1 && this.FRList.splice(frIndex, 1);
      this.FRList.push(faceID);
      this.FRList.length >= 200 && this.FRList.shift();
      // document.getElementById("facelist").innerHTML += '<li><div class="face-wheel-li"><div class="time-view"><p class="time-font">识别时间:'+faces[f].time+'</p></div><div class="side-menu"><div class="img-div"><img class="imgc" src="'+faces[f].cimg+'"></div><div class="img-div"><img class="imgc" src="'+faces[f].faceurl+'"></div></div></div></li>';
      // $('#facelist').children().length > 5 && this.FaceMove();
    }
  },

  FaceMove: function() {
    var oDiv = document.getElementById('face-wheel');
    var oUl = oDiv.getElementsByTagName('ul')[0];
    var aLi = oUl.getElementsByTagName('li');
    var timer = null;
    var iSpeed = -10;
    timer = setTimeout(fnMove, 100);
    function fnMove() {
      oUl.style.top = oUl.offsetTop + iSpeed + 'px';
      if ((oUl.offsetTop % 160) == 0) {
        clearInterval(timer);
        aLi[0].remove();
        oUl.style.top = 0;
        return
      } else {
        clearInterval(timer);
        timer = setTimeout(fnMove, 100);
      }
    }
  },
};


// var fsCanvas;

// this.addEventListener('message', function (e) {
//   if (e.data.data == 'init') {
//     fsCanvas = e.data.canvas
//   } else {
//     var evJsonData = JSON.parse(e.data.data);
//     if (evJsonData.hasOwnProperty("FS_RECTS")) {
//         FSDrawCanvas.CanvasClear(fsCanvas);
//         var rects = evJsonData.FS_RECTS;
//         // rects.length > 0 && console.log("get rects time:" + new Date().getTime());
//         var scale = 1280 / 1920;
//         FSDrawCanvas.CanvasDrawRects(fsCanvas, rects, scale)
//     };
    
//     if (evJsonData.hasOwnProperty("FR_RESULTS")) {
//         var frResult = evJsonData.FR_RESULTS;
//         FSDrawCanvas.FaceRecognition(frResult)
//     };
    
//     if (evJsonData.hasOwnProperty("LPR_Result")) {
//         var LPR_Results = evJsonData.LPR_Result;
//         if (LPR_Results.length == 0) {
//             return
//         }
//         lprStartTime = (new Date()).getTime();
//         FSDrawCanvas.CanvasClear(lprCanvas);
//         FSDrawCanvas.CanvasDrawWords(lprCanvas, LPR_Results);
//     } 
//   }
  

// }, false);


