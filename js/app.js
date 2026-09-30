"use strict";

/* =========================================================
   DATA
========================================================= */

const NOTES = [
    "C","C#","D","D#","E","F",
    "F#","G","G#","A","A#","B"
];

const DISPLAY_NOTES = [
    "C","C♯","D","D♯","E","F",
    "F♯","G","G♯","A","A♯","B"
];

/*
    String order in the application:
    0 = low E
    1 = A
    2 = D
    3 = G
    4 = B
    5 = high E
*/

const STRING_NAMES = ["E","A","D","G","B","E"];

const OPEN_NOTES = [
    4,   // low E
    9,   // A
    2,   // D
    7,   // G
    11,  // B
    4    // high E
];

const INTERVALS = [
    {semitones:0,  short:"P1", name:"Perfect Unison"},
    {semitones:1,  short:"m2", name:"Minor 2nd"},
    {semitones:2,  short:"M2", name:"Major 2nd"},
    {semitones:3,  short:"m3", name:"Minor 3rd"},
    {semitones:4,  short:"M3", name:"Major 3rd"},
    {semitones:5,  short:"P4", name:"Perfect 4th"},
    {semitones:6,  short:"TT", name:"Tritone"},
    {semitones:7,  short:"P5", name:"Perfect 5th"},
    {semitones:8,  short:"m6", name:"Minor 6th"},
    {semitones:9,  short:"M6", name:"Major 6th"},
    {semitones:10, short:"m7", name:"Minor 7th"},
    {semitones:11, short:"M7", name:"Major 7th"},
    {semitones:12, short:"P8", name:"Octave"}
];


/* =========================================================
   HELPERS
========================================================= */

function $(id){
    return document.getElementById(id);
}

function noteIndex(note){
    return NOTES.indexOf(note);
}

function noteFromInterval(root,semitones){
    return NOTES[(noteIndex(root)+semitones)%12];
}

function getInterval(semitones){
    return INTERVALS.find(x=>x.semitones===semitones);
}

function populateNotes(select){
    NOTES.forEach((note,i)=>{
        const option=document.createElement("option");
        option.value=note;
        option.textContent=DISPLAY_NOTES[i];
        select.appendChild(option);
    });
}

function populateIntervals(select){
    INTERVALS.forEach(interval=>{
        const option=document.createElement("option");
        option.value=interval.semitones;
        option.textContent=
            `${interval.short} · ${interval.name}`;
        select.appendChild(option);
    });
}


/* =========================================================
   SELECT INITIALIZATION
========================================================= */

populateNotes($("explorer-root"));
populateNotes($("game1-root"));
populateNotes($("game1-answer"));
populateNotes($("game2-root"));

populateIntervals($("explorer-interval"));
populateIntervals($("game1-interval"));
populateIntervals($("game2-interval"));


/* =========================================================
   INTERVAL TABLE
========================================================= */

INTERVALS.forEach(interval=>{

    const row=document.createElement("tr");

    row.innerHTML=`
        <td>${interval.semitones}</td>
        <td><b>${interval.short}</b></td>
        <td>${interval.name}</td>
    `;

    $("interval-table").appendChild(row);
});


/* =========================================================
   TABS
========================================================= */

document.querySelectorAll(".tab").forEach(tab=>{

    tab.addEventListener("click",()=>{

        document
            .querySelectorAll(".tab")
            .forEach(x=>x.classList.remove("active"));

        document
            .querySelectorAll(".section")
            .forEach(x=>x.classList.remove("active"));

        tab.classList.add("active");

        $(tab.dataset.tab).classList.add("active");

    });

});


/* =========================================================
   FRETBOARD GEOMETRY
========================================================= */

const FB = {
    left:6,
    right:98
};

function fretX(fret,count){

    if(fret===0){
        return 3;
    }

    return FB.left +
        ((fret-0.5)/count) *
        (FB.right-FB.left);
}

function fretLineX(fret,count){

    return FB.left +
        (fret/count) *
        (FB.right-FB.left);
}


/* =========================================================
   FRETBOARD ZOOM
========================================================= */

const fretboardZoom={
    "explorer-fretboard":1,
    "game2-fretboard":1
};

function getFretboardScale(id){
    return fretboardZoom[id] || 1;
}

function updateFretboardZoom(id){
    const board=$(id);
    const wrap=$(id+"-wrap");
    const stage=$(id+"-stage");
    if(!board || !wrap || !stage) return;

    const scale=getFretboardScale(id);
    const baseW=Math.max(280, wrap.clientWidth);
    const baseH=baseW*(340/1100);

    board.style.width=baseW+"px";
    board.style.height=baseH+"px";
    board.style.transform=`scale(${scale})`;
    board.style.transformOrigin="top left";

    stage.style.width=(baseW*scale)+"px";
    stage.style.height=(baseH*scale)+"px";
    stage.style.minWidth=(baseW*scale)+"px";

    const value=$(id==="explorer-fretboard" ? "explorer-zoom-value" : "game2-zoom-value");
    if(value) value.textContent=`${Math.round(scale*100)}%`;
}

function fitFretboard(id){
    const board=$(id);
    const wrap=$(id+"-wrap");
    if(!board || !wrap) return;

    fretboardZoom[id]=1;
    updateFretboardZoom(id);
}

function changeFretboardZoom(id,amount){
    fretboardZoom[id]=Math.min(2,Math.max(0.75,getFretboardScale(id)+amount));
    updateFretboardZoom(id);
}

document.querySelectorAll("[data-zoom-target]").forEach(button=>{
    button.addEventListener("click",()=>{
        const id=button.dataset.zoomTarget;
        const action=button.dataset.zoomAction;
        if(action==="fit") fitFretboard(id);
        if(action==="in") changeFretboardZoom(id,0.10);
        if(action==="out") changeFretboardZoom(id,-0.10);
    });
});

let fitResizeTimer;
window.addEventListener("resize",()=>{
    clearTimeout(fitResizeTimer);
    fitResizeTimer=setTimeout(()=>{
        // Keep the user's zoom level, but recalculate the board's base width
        // so it always fills the available screen/card width.
        updateFretboardZoom("explorer-fretboard");
        updateFretboardZoom("game2-fretboard");
    },120);
});


/* =========================================================
   CREATE FRETBOARD
========================================================= */

function createFretboard(
    container,
    fretCount,
    onNoteClick
){

    container.innerHTML="";

    /* Nut */

    const nut=document.createElement("div");
    nut.className="nut";
    nut.style.left=`${FB.left}%`;
    container.appendChild(nut);


    /* Frets */

    for(let fret=1;fret<=fretCount;fret++){

        const line=document.createElement("div");

        line.className="fret";
        line.style.left=
            `${fretLineX(fret,fretCount)}%`;

        container.appendChild(line);


        const number=document.createElement("div");

        number.className="fret-number";
        number.textContent=fret;
        number.style.left=
            `${fretX(fret,fretCount)}%`;

        container.appendChild(number);
    }


    /* Zero */

    const zero=document.createElement("div");

    zero.className="fret-number";
    zero.textContent="0";
    zero.style.left="3%";

    container.appendChild(zero);


    /* Single inlays */

    [3,5,7,9,15,17,19,21]
        .filter(x=>x<=fretCount)
        .forEach(fret=>{

            const dot=document.createElement("div");

            dot.className="inlay";
            dot.style.left=
                `${fretX(fret,fretCount)}%`;
            dot.style.top="50%";

            container.appendChild(dot);
        });


    /* Double inlays */

    [12,24]
        .filter(x=>x<=fretCount)
        .forEach(fret=>{

            [36,64].forEach(top=>{

                const dot=document.createElement("div");

                dot.className="inlay";

                dot.style.left=
                    `${fretX(fret,fretCount)}%`;

                dot.style.top=`${top}%`;

                container.appendChild(dot);
            });
        });


    /* Strings */

    /*
        Visual string order: high E at the top, low E at the bottom.
        The internal string numbering and tuning data stay unchanged.
    */
    const stringY=[
        93,76,59,42,25,8
    ];

    stringY.forEach((y,string)=>{

        const line=document.createElement("div");

        line.className="string";

        if(string===0 || string===5){
            line.classList.add("thick");
        }else if(string===1 || string===4){
            line.classList.add("medium");
        }

        line.style.top=`${y}%`;

        container.appendChild(line);


        const label=document.createElement("div");

        label.className="string-label";
        label.textContent=DISPLAY_NOTES[OPEN_NOTES[string]];
        label.title=`Open string: ${DISPLAY_NOTES[OPEN_NOTES[string]]}`;
        label.style.top=`${y}%`;

        container.appendChild(label);
    });


    /* Notes */

    for(let string=0;string<6;string++){

        for(let fret=0;fret<=fretCount;fret++){

            const note=
                NOTES[
                    (OPEN_NOTES[string]+fret)%12
                ];

            const marker=
                document.createElement("button");

            marker.type="button";
            marker.className="note neutral";

            marker.dataset.note=note;
            marker.dataset.string=string;
            marker.dataset.fret=fret;

            marker.textContent=note;

            marker.style.left=
                `${fretX(fret,fretCount)}%`;

            marker.style.top=
                `${stringY[string]}%`;

            marker.title=
                `${note} · ${STRING_NAMES[string]} string · fret ${fret}`;

            if(onNoteClick){

                marker.addEventListener(
                    "click",
                    ()=>onNoteClick(
                        marker,
                        note,
                        string,
                        fret
                    )
                );
            }

            container.appendChild(marker);
        }
    }
}


/* =========================================================
   EXPLORER
========================================================= */

function renderExplorer(){

    const root=$("explorer-root").value;

    const semitones=
        Number($("explorer-interval").value);

    const fretCount=
        Number($("explorer-frets").value);

    const interval=getInterval(semitones);

    const target=
        noteFromInterval(root,semitones);

    $("explorer-question").textContent=
        `${DISPLAY_NOTES[noteIndex(target)]} is the ${interval.name} (${interval.short}) of ${DISPLAY_NOTES[noteIndex(root)]}`;


    createFretboard(
        $("explorer-fretboard"),
        fretCount,
        (marker,note,string,fret)=>{

            document
                .querySelectorAll(
                    "#explorer-fretboard .note"
                )
                .forEach(x=>x.classList.remove("correct"));

            marker.classList.add("correct");

            const distance=
                (noteIndex(note)-noteIndex(root)+12)%12;

            let intervalText;

            if(distance===0 && semitones===12){
                intervalText="Octave / same note class";
            }else if(distance===0){
                intervalText="Perfect Unison";
            }else{
                intervalText=
                    getInterval(distance)?.name ||
                    "Unknown";
            }

            $("explorer-detail").innerHTML=
                `<b>${DISPLAY_NOTES[noteIndex(note)]}</b>
                 · String ${6-string}
                 (${STRING_NAMES[string]})
                 · Fret ${fret}
                 · <span class="pill">${intervalText}</span>`;
        }
    );


    /*
        Color root and target notes.
        Explorer intentionally reveals both.
    */

    document
        .querySelectorAll(
            "#explorer-fretboard .note"
        )
        .forEach(marker=>{

            const note=marker.dataset.note;

            if(note===root){
                marker.className="note root";
            }else if(note===target){
                marker.className="note correct";
            }else{
                marker.style.display="none";
            }

        });
}

$("explorer-show")
    .addEventListener("click",renderExplorer);


/* =========================================================
   GAME 1
========================================================= */

const game1={
    root:"G",
    interval:4,
    score:0,
    streak:0,
    freezeRoot:false,
    freezeInterval:false,
    answered:false
};


function newGame1Question(){

    if(!game1.freezeRoot){

        if($("game1-root-mode").value==="fixed"){

            game1.root=$("game1-root").value;

        }else{

            game1.root=
                NOTES[
                    Math.floor(
                        Math.random()*NOTES.length
                    )
                ];
        }
    }


    if(!game1.freezeInterval){

        if($("game1-interval-mode").value==="fixed"){

            game1.interval=
                Number($("game1-interval").value);

        }else{

            game1.interval=
                Math.floor(Math.random()*13);
        }
    }


    const interval=
        getInterval(game1.interval);

    $("game1-question").textContent=
        `What is the ${interval.name} of ${DISPLAY_NOTES[noteIndex(game1.root)]}?`;

    $("game1-feedback").textContent="";
    $("game1-feedback").className="feedback";

    game1.answered=false;
}

$("game1-submit").addEventListener("click",()=>{

    if(game1.answered)return;

    const answer=$("game1-answer").value;

    const correct=
        noteFromInterval(
            game1.root,
            game1.interval
        );

    if(answer===correct){

        game1.score++;
        game1.streak++;

        $("game1-feedback").textContent=
            `✓ Correct — ${DISPLAY_NOTES[noteIndex(correct)]} is the answer.`;

        $("game1-feedback").className=
            "feedback good";

    }else{

        game1.streak=0;

        $("game1-feedback").textContent=
            `✗ Not quite. The answer is ${DISPLAY_NOTES[noteIndex(correct)]}.`;

        $("game1-feedback").className=
            "feedback bad";
    }

    game1.answered=true;

    $("game1-score").textContent=game1.score;
    $("game1-streak").textContent=game1.streak;
});


$("game1-new").addEventListener(
    "click",
    newGame1Question
);


$("game1-freeze-root").addEventListener(
    "click",
    ()=>{

        game1.freezeRoot=!game1.freezeRoot;

        $("game1-freeze-root").textContent=
            game1.freezeRoot
            ? "Root Frozen"
            : "Freeze Root";

        $("game1-freeze-root")
            .classList.toggle(
                "active-control",
                game1.freezeRoot
            );
    }
);


$("game1-freeze-interval").addEventListener(
    "click",
    ()=>{

        game1.freezeInterval=
            !game1.freezeInterval;

        $("game1-freeze-interval").textContent=
            game1.freezeInterval
            ? "Interval Frozen"
            : "Freeze Interval";

        $("game1-freeze-interval")
            .classList.toggle(
                "active-control",
                game1.freezeInterval
            );
    }
);


[
    "game1-root-mode",
    "game1-root",
    "game1-interval-mode",
    "game1-interval"
].forEach(id=>{
    $(id).addEventListener(
        "change",
        newGame1Question
    );
});


/* =========================================================
   GAME 2
   FIND EVERY TARGET POSITION
========================================================= */

const game2={
    root:"G",
    interval:4,
    score:0,
    streak:0,
    found:new Set(),
    targets:[],
    freezeRoot:false,
    freezeInterval:false,
    completed:false
};


function getGame2TargetPositions(){

    const fretCount=
        Number($("game2-frets").value);

    const target=
        noteFromInterval(
            game2.root,
            game2.interval
        );

    const positions=[];

    for(let string=0;string<6;string++){

        for(let fret=0;fret<=fretCount;fret++){

            const note=
                NOTES[
                    (OPEN_NOTES[string]+fret)%12
                ];

            if(note===target){

                positions.push(
                    `${string}-${fret}`
                );
            }
        }
    }

    return positions;
}


function updateGame2Status(){

    $("game2-found").textContent=
        game2.found.size;

    $("game2-total").textContent=
        game2.targets.length;

    $("game2-score").textContent=
        game2.score;

    $("game2-streak").textContent=
        game2.streak;
}


function newGame2Question(){

    /*
        IMPORTANT:
        Frozen root/interval stays unchanged.
    */

    if(!game2.freezeRoot){

        if($("game2-root-mode").value==="fixed"){

            game2.root=
                $("game2-root").value;

        }else{

            game2.root=
                NOTES[
                    Math.floor(
                        Math.random()*NOTES.length
                    )
                ];
        }
    }


    if(!game2.freezeInterval){

        if($("game2-interval-mode").value==="fixed"){

            game2.interval=
                Number($("game2-interval").value);

        }else{

            game2.interval=
                Math.floor(Math.random()*13);
        }
    }


    game2.found=new Set();

    game2.completed=false;

    game2.targets=
        getGame2TargetPositions();


    const interval=
        getInterval(game2.interval);

    $("game2-question").textContent=
        `Find ALL ${interval.name}s of ${DISPLAY_NOTES[noteIndex(game2.root)]}`;

    $("game2-feedback").textContent="";
    $("game2-feedback").className="feedback";

    $("game2-detail").textContent=
        "Find every occurrence of the target interval.";

    updateGame2Status();

    renderGame2Fretboard();
}


function renderGame2Fretboard(){

    const fretCount=
        Number($("game2-frets").value);

    const showNames=
        $("game2-note-names").value==="show";


    createFretboard(
        $("game2-fretboard"),
        fretCount,
        handleGame2Click
    );


    document
        .querySelectorAll(
            "#game2-fretboard .note"
        )
        .forEach(marker=>{

            const note=
                marker.dataset.note;

            /*
                Root is visible as the reference.
            */

            if(note===game2.root){

                marker.classList.remove("neutral");
                marker.classList.add("root");

            }else{

                marker.classList.add("neutral");

            }


            /*
                Hide or show names.
            */

            if(showNames){

                marker.textContent=note;

            }else{

                marker.textContent="";

                marker.classList.add(
                    "hidden-name"
                );
            }

        });
}


function handleGame2Click(
    marker,
    note,
    string,
    fret
){

    const target=
        noteFromInterval(
            game2.root,
            game2.interval
        );

    const position=
        `${string}-${fret}`;


    /*
        Do nothing if already found.
    */

    if(game2.found.has(position)){

        return;
    }


    /*
        CORRECT
    */

    if(note===target){

        game2.found.add(position);

        marker.classList.remove(
            "neutral",
            "wrong",
            "hidden-name"
        );

        marker.classList.add(
            "correct"
        );


        /*
            If note names are hidden,
            the correct note can still be
            shown after the user finds it.
        */

        marker.textContent=note;


        $("game2-feedback").textContent=
            `✓ Correct — ${DISPLAY_NOTES[noteIndex(note)]} found at string ${6-string}, fret ${fret}.`;

        $("game2-feedback").className=
            "feedback good";


        $("game2-detail").innerHTML=
            `<b>${DISPLAY_NOTES[noteIndex(note)]}</b>
             · String ${6-string}
             (${STRING_NAMES[string]})
             · Fret ${fret}
             · <span class="pill">${getInterval(game2.interval).name}</span>`;


        updateGame2Status();


        /*
            ALL TARGETS FOUND
        */

        if(
            game2.found.size===
            game2.targets.length
        ){

            game2.completed=true;

            game2.score++;
            game2.streak++;


            $("game2-feedback").textContent=
                `🔥 COMPLETE! You found all ${target}s across the selected fretboard.`
                .replace("${target}",target);

            $("game2-feedback").className=
                "feedback good";


            updateGame2Status();
        }

    }else{

        /*
            WRONG
        */

        game2.streak=0;

        marker.classList.add("wrong");

        $("game2-feedback").textContent=
            `✗ ${DISPLAY_NOTES[noteIndex(note)]} is not the ${getInterval(game2.interval).name} of ${DISPLAY_NOTES[noteIndex(game2.root)]}.`;

        $("game2-feedback").className=
            "feedback bad";


        $("game2-detail").innerHTML=
            `You clicked
             <b>${DISPLAY_NOTES[noteIndex(note)]}</b>
             · String ${6-string}
             (${STRING_NAMES[string]})
             · Fret ${fret}`;


        updateGame2Status();


        /*
            Remove wrong state after 600ms.
        */

        setTimeout(()=>{

            marker.classList.remove("wrong");

        },600);
    }
}


/* =========================================================
   GAME 2 CONTROLS
========================================================= */

$("game2-new").addEventListener(
    "click",
    newGame2Question
);


$("game2-frets").addEventListener(
    "change",
    newGame2Question
);


$("game2-note-names").addEventListener(
    "change",
    renderGame2Fretboard
);


$("game2-root-mode").addEventListener(
    "change",
    newGame2Question
);


$("game2-root").addEventListener(
    "change",
    newGame2Question
);


$("game2-interval-mode").addEventListener(
    "change",
    newGame2Question
);


$("game2-interval").addEventListener(
    "change",
    newGame2Question
);


$("game2-freeze-root").addEventListener(
    "click",
    ()=>{

        game2.freezeRoot=
            !game2.freezeRoot;

        $("game2-freeze-root").textContent=
            game2.freezeRoot
            ? "Root Frozen"
            : "Freeze Root";

        $("game2-freeze-root")
            .classList.toggle(
                "active-control",
                game2.freezeRoot
            );
    }
);


$("game2-freeze-interval").addEventListener(
    "click",
    ()=>{

        game2.freezeInterval=
            !game2.freezeInterval;

        $("game2-freeze-interval").textContent=
            game2.freezeInterval
            ? "Interval Frozen"
            : "Freeze Interval";

        $("game2-freeze-interval")
            .classList.toggle(
                "active-control",
                game2.freezeInterval
            );
    }
);


/* =========================================================
   INITIAL QUESTIONS
========================================================= */

newGame1Question();
newGame2Question();
renderExplorer();
fitFretboard("explorer-fretboard");
fitFretboard("game2-fretboard");
