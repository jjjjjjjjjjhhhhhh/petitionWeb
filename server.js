const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const crypto = require("crypto");
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("views"));
require("dotenv").config();

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");

app.use(cookieParser());
app.use(
  session({ secret: "secretcode", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

var bool = false;
var login_status = false;

let localDate = new Date().toLocaleDateString();
var arr = [];

var random = 0;
const MongoClient = require("mongodb").MongoClient;
const e = require("express");
const { runInNewContext } = require("vm");
var db;

MongoClient.connect(
  "mongodb+srv://Tfadmin:qwerty1111@tfteam.aqtsspy.mongodb.net/?retryWrites=true&w=majority",
  (err, client) => {
    if (err) return console.log(err);
    db = client.db("petitionWeb");

    app.listen(8080, () => {
      console.log("http://localhost:8080");
    });
  }
);

app.get("/", (req, res) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      arr = [];
      res.render("home", {
        sortedPosts: highestVote(result),
        findWaiting: findWaiting(result),
        posts: result,
        info: req.user,
        replied: answered(result),
      });
    });
});

app.get("/myPage", loginStat, (req, res) => {
  db.collection("petitions")
    .find({ author: req.user.name })
    .toArray((err, result) => {
      res.render("myPage", { info: req.user, posts: result });
      console.log(result);
    });
});

app.post("/delete/:id", (req, res) => {
  db.collection("petitions").deleteOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {}
  );
  res.send(
    '<script>alert("청원이 삭제 되었습니다");window.location="/myPage"</script>'
  );
});

app.get("/ansed/:id", (req, res) => {
  res.render("ansed", { info: req.user });
  db.collection("petitions").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      if (result.대답 == true) {
        res.render("ansed", { data: result, info: req.user });
      } else {
        redirect("/");
      }
    }
  );
});

app.get("/write", loginStat, (req, res) => {
  // if (login_status == true) {
  res.render("write", { info: req.user });
  // } else {
  //   res.send(
  //     '<script>alert("로그인을 먼저 해주세요");window.location="/"</script>'
  //   );
  // }
});

app.post("/done", (req, res) => {
  db.collection("counter").findOne({ name: "postNum" }, (err, result) => {
    var totalPetitions = result.totalPost;
    var author;
    if (req.body.anonymous == null) {
      author = req.user.mail;
    } else {
      author = req.user.name;
    }
    console.log(req.body.anonymous);
    console.log(req.user);
    console.log(author);
    db.collection("petitions").insertOne(
      {
        _id: totalPetitions + 1,
        청원제목: req.body.title,
        청원내용: req.body.markdown,
        status: "start",
        청원시작: localDate,
        청원마감: changeDate(
          parseInt(localDate.substring(4)),
          parseInt(localDate.substring(0, 2)),
          parseInt(localDate.substring(2))
        ),
        liked: 0,
        author: author,
        reply: "",
      },
      () => {
        console.log("저장완료");
        db.collection("counter").updateOne(
          { name: "postNum" },
          { $inc: { totalPost: 1 } },
          (err, result) => {
            if (err) return console.log(error);
            res.render("done", { info: req.user });
          }
        );
      }
    );
  });
});

app.get("/detail/:id", loginStat, (req, res) => {
  db.collection("petitions").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("detail", { data: result, info: req.user });
    }
  );
});

app.get("/petitionlist/:page", loginStat, (res, rep) => {
  const resultPerPage = 9;
  const page = res.params.page || 1;
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      numOfResults = result.length;
      result = findPage(result, page);
      console.log(result);
      rep.render("petition_list", {
        numOfResults: numOfResults,
        resultPerPage: resultPerPage,
        pages: Math.ceil(numOfResults / resultPerPage),
        currentPage: page,
        posts: result,
        info: res.user,
      });
    });
});

app.get("/answered/:page", loginStat, (res, rep) => {
  const resultPerPage = 9;
  const page = res.params.page || 1;
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      numOfResults = answered(result).length;
      result = findPage(answered(result), page);
      console.log("numOfResults : " + numOfResults);
      console.log(answered(result));
      rep.render("answeredPetitions", {
        numOfResults: numOfResults,
        resultPerPage: resultPerPage,
        pages: Math.ceil(numOfResults / resultPerPage),
        currentPage: page,
        posts: result,
        info: res.user,
      });
    });
});

app.get("/answerpetition/:id", loginStat, (req, res) => {
  db.collection("acc").findOne({ name: req.user.name }, (err, result) => {
    if (result.dev != null) {
      db.collection("petitions").findOne(
        { _id: parseInt(req.params.id) },
        (err, result) => {
          res.render("answerpetition", { data: result, info: req.user });
        }
      );
    } else {
      res.send(
        '<script>alert("승인되지 않은 접근입니다.");window.location="/"</script>'
      );
    }
  });
});

app.get("/waiting/:page", loginStat, (res, rep) => {
  const resultPerPage = 9;
  const page = res.params.page || 1;
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      numOfResults = findWaiting(result).length;
      result = findPage(findWaiting(result), page)
      rep.render("waiting", {
        numOfResults: numOfResults,
        resultPerPage: resultPerPage,
        pages: Math.ceil(numOfResults / resultPerPage),
        currentPage: page,
        posts: result,
        info: res.user,
      });
    });
});

app.post("/postanswer/:id", (req, res) => {
  console.log("답변 : " + req.body.markdown);
  console.log("_id : " + typeof req.body.markdown);
  db.collection("petitions").updateOne(
    { _id: parseInt(req.params.id) },
    { $set: { reply: req.body.markdown } },
    (err, result) => {
      db.collection("petitions").updateOne(
        { _id: parseInt(req.params.id) },
        { $set: { status: "answered" } },
        (err, result) => {
          res.send(
            '<script>alert("답변되었습니다");window.location="/"</script>'
          );
        }
      );
    }
  );
});

app.post("/vote/:id", loginStat, (req, res) => {
  db.collection("acc").findOne({ mail: req.user.mail }, (err, result) => {
    for (var object = 0; object <= result.likedId.length; object++) {
      if (result.likedId[object] == req.params.id) {
        res.send(
          '<script>alert("이미 동의하신 청원입니다");window.location="/"</script>'
        );
        return;
      }
    }
    db.collection("acc").updateOne(
      { mail: req.user.mail },
      { $push: { likedId: req.params.id } },
      (err, result) => {
        db.collection("petitions").findOne(
          { _id: parseInt(req.params.id) },
          (err, result) => {
            if (result.liked == 199) {
              db.collection("petitions").updateOne(
                { _id: parseInt(req.params.id) },
                { $set: { status: "waiting" } },
                (err, result) => {
                  console.log("sucess");
                }
              );
            }
          }
        );
        db.collection("petitions").updateOne(
          { _id: parseInt(req.params.id) },
          { $inc: { liked: 1 } },
          (err, result) => {
            console.log("voted");
            res.send(
              '<script>alert("동의해주셔서 감사합니다");window.location="/"</script>'
            );
          }
        );
      }
    );
  });
});

app.get("/fail", (req, res) => {
  res.render("login_error", { info: req.user });
});
app.get("/answer", (req, rep) => {
  db.collection("acc").findOne({ name: req.user.name }, (err, result) => {
    if (result.dev != null) {
      db.collection("petitions")
        .find()
        .toArray(function (err, result) {
          arr = [];
          rep.render("answer", {
            posts: findWaiting(result),
            info: req.user,
          });
        });
    } else {
      rep.send(
        '<script>alert("승인되지 않은 접근입니다");window.location="/"</script>'
      );
    }
  });
});
app.get("/login", (req, rep) => {
  rep.render("login", { info: req.user });
});
app.get("/petition", (req, rep) => {
  rep.render("home", { info: req.user });
});
app.get("/register", (req, rep) => {
  rep.render("register", { info: req.user });
});
app.get("/done", (req, res) => {
  res.render("done", { info: req.user });
});
app.get("/fail", (req, res) => {
  res.render("fail");
});
app.get("/verify", (req, res) => {
  res.render("registerVerify");
});

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "noreplytfteamproject@gmail.com",
    pass: "jsurhkeglubqeuoj", // generated ethereal password
  },
});

// send mail with defined transport object

app.post("/verifynum", (req, res) => {
  let ps = req.cookies.verpass;
  let ml = req.cookies.vermail;
  let nm = req.cookies.vername;

  if (req.body.verify == random) {
    res.send(
      '<script>alert("회원가입이 완료되었습니다");window.location="/"</script>'
    );

    db.collection("counter").findOne({ name: "countacc" }, (err, result) => {
      try {
        var accNum = result.totalacc;
        let hashedPass = crypto
          .createHash("sha256")
          .update(ps)
          .digest("base64");
        console.log(hashedPass);
        console.log("mail:", ml);
        console.log("password:", hashedPass);

        db.collection("acc").insertOne(
          {
            _id: accNum + 1,
            name: nm,
            mail: ml,
            pass: hashedPass,
            likedId: [0],
          },
          () => {
            db.collection("counter").updateOne(
              { name: "countacc" },
              { $inc: { totalacc: 1 } },
              (err, result) => {
                if (err) return console.log(error);
              }
            );
          }
        );
      } catch {
        res.redirect("/register");
      }
    });
  } else {
    res.send(
      '<script>alert("일치하지 않습니다");window.location="/verify"</script>'
    );
  }
});

app.post("/register", (req, rep) => {
  random = Math.floor(Math.random() * 100 + 54);
  rep.cookie("Verifycookie", random);
  if (req.body.password != req.body.passcheck) {
    rep.send(
      '<script>alert("비밀번호 확인이 일치하지 않습니다.");window.location="/register"</script>'
    );
  } else {
    db.collection("acc").findOne({ mail: req.body.mail }, (err, result) => {
      if (result != null) {
        rep.send(
          '<script>alert("이미 존재하는 계정입니다");window.location="/"</script>'
        );
      } else {
        db.collection("acc").findOne({ name: req.body.name }, (err, result) => {
          if (result != null) {
            rep.send(
              '<script>alert("이미 존재하는 닉네임입니다");window.location="/"</script>'
            );
          } else {
            rep.cookie("vermail", req.body.mail);
            rep.cookie("verpass", req.body.password);
            rep.cookie("vername", req.body.name);

            transporter.sendMail({
              from: "noreplytfteamproject@gmail.com", // sender address
              to: req.body.mail, // list of receivers
              subject: "Kis 학생청원 인증번호 ✔", // Subject line
              // text: "귀하의 인증번호는 : "+random+" 입니다.", // plain text body
              html: "<b>귀하의 인증번호는 : " + random + " 입니다.</b>", // html body
            });
            rep.redirect("/verify");
          }
        });
      }
    });
  }
});

function verifyMail(res) {
  res.redirect("/");
}

function confirmedRegister(req, rep) {}

// app.post("/login", (req, rep) => {
//   db.collection("counter").findOne({ name: "countacc" }, (err, result) => {
//     db.collection("acc").findOne({ mail: req.body.loginmail }, (err, res) => {
//       if (res == null) {
//         console.log("mail incorrectly directed");
//         rep.send(
//           '<script>alert("존재하지 않는 계정입니다");window.location="/register"</script>'
//         );
//       } else {
//         console.log(res);
//         console.log(req.body.loginmail);
//         let inputPass = crypto
//           .createHash("sha256")
//           .update(req.body.loginpassword)
//           .digest("base64");
//         console.log(inputPass);

//         if (req.body.loginmail == res.mail) {
//           console.log("mail correctly directed");

//           if (inputPass == res.pass) {
//             console.log("password correctly directed");
//             console.log(req.body.loginmail);
//             login_mail = req.body.loginmail;
//             login_states = res.name;
//             login_status = true;
//             rep.send(
//               '<script>alert("로그인이 완료되었습니다");window.location="/"</script>'
//             );
//           } else {
//             console.log("password incorrectly directed");
//             rep.send(
//               '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
//             );
//           }
//         } else {
//           console.log("mail incorrectly directed");
//           rep.send(
//             '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
//           );
//         }
//       }
//     });
//   });
// });

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  function (req, rep) {
    rep.redirect("/");
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "loginmail",
      passwordField: "loginpassword",
      session: true,
      passReqToCallback: false,
    },
    function (inpid, inppass, done) {
      console.log(inpid, inppass);

      //console.log(입력한아이디, 입력한비번);
      db.collection("acc").findOne({ mail: inpid }, (err, res) => {
        if (err) return done(err);

        if (!res) return done(null, false, console.log("wrong mail"));

        let inputPass = crypto
          .createHash("sha256")
          .update(inppass)
          .digest("base64");
        if (inputPass == res.pass) {
          console.log("logged in successfully");
          return done(null, res);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.mail);
});

passport.deserializeUser(function (id, done) {
  db.collection("acc").findOne({ mail: id }, (err, res) => {
    done(null, res);
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("connect.sid");
  res.redirect("/");
});

app.get("/test", (rep, req) => {
  verifyMail(req);
});

function loginStat(req, rep, next) {
  if (req.user) {
    next();
  } else {
    rep.send(
      '<script>alert("로그인 이후 사용해 주세요");window.location="/"</script>'
    );
  }
}

function loginStatforteacher(req, rep, next) {
  if (req.user == ("김대선" || "우선하" || "강원구" || "손성호")) {
    next();
  } else {
    rep.send(
      '<script>alert("진입 할 수 없습니다");window.location="/"</script>'
    );
  }
}
var testDate = "9/5/2022";
//함수

function changeDate(year, month, date) {
  if (month == 2) {
    if (date + 14 > 29) {
      month++;
      date = date + 14 - 29;
    } else {
      date += 14;
    }
  } else if (
    month == 1 ||
    month == 3 ||
    month == 5 ||
    month == 7 ||
    month == 8 ||
    month == 10 ||
    month == 12
  ) {
    if (date + 14 > 31) {
      date = date + 14 - 31;
      if (month == 12) {
        month = 1;
      } else {
        month++;
      }
    } else {
      date += 14;
    }
  } else {
    if (date + 14 > 30) {
      month++;
      date = date + 14 - 30;
    } else {
      date += 14;
    }
  }
  return month + "/" + date + "/" + year;
}

function answered(list) {
  arr = [];
  for (var object in list) {
    if (list[object].status == "answered") {
      var obj = list[object];
      arr.push(obj);
    }
  }
  return arr;
}

function findWaiting(list) {
  arr = [];
  for (var object in list) {
    if (list[object].status == "waiting") {
      var obj = list[object];
      arr.push(obj);
    }
  }
  return arr;
}

function highestVote(list) {
  array = list.sort(function (a, b) {
    return b.liked - a.liked;
  });
  return array;
}

function findPage(list, page) {
  arr = [];
  for (var i = (page - 1) * 9; i < page * 9; i++) {
    if (list[i] == null) {
      break;
    }
    arr.push(list[i]);
  }
  console.log(arr);
  return arr;
}
