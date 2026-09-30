import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
function setup(){const db=new DatabaseSync(':memory:');db.exec(readFileSync('database/migrations/0001_initial.sql','utf8'));db.exec("INSERT INTO users(id,auth_subject,username,created_at) VALUES ('a','a','A',0),('b','b','B',0); INSERT INTO problems(id,public_json,private_json) VALUES('p','{}','[]'); INSERT INTO matches(id,problem_id,mode,player_a,player_b,created_at) VALUES('m','p','ranked','a','b',0);");return db;}
const insert="INSERT INTO settlements VALUES('m','digest',1,'a','b',1200,1200,0,0,16,1,0) ON CONFLICT(match_id) DO NOTHING";
test('duplicate settlement cannot apply rating or counters twice',()=>{const db=setup();db.exec(insert);db.exec(insert);assert.equal(db.prepare("SELECT rating FROM users WHERE id='a'").get()!.rating,1216);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rating_events').get()!.n,2);assert.equal(db.prepare("SELECT games_played FROM users WHERE id='b'").get()!.games_played,1);db.close();});
test('stale rating version aborts whole settlement',()=>{const db=setup();db.exec("UPDATE users SET rating_version=1 WHERE id='b'");assert.throws(()=>db.exec(insert),/stale rating B/);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM settlements').get()!.n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rating_events').get()!.n,0);assert.equal(db.prepare("SELECT rating FROM users WHERE id='a'").get()!.rating,1200);db.close();});
test('unrated settlement does not change ranked stats',()=>{const db=setup();db.exec(insert.replace(",'digest',1,",",'digest',0,"));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM rating_events').get()!.n,0);db.close();});
