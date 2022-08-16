
import { assertIsError } from "https://deno.land/std@0.152.0/testing/asserts.ts";
import tk from '../testkit.js';

Deno.test('tidb-36438', { ignore: true }, async t => {
  const tidb = tk.args().tidb;

  await tk.withConnections([tidb, tidb], async ([c1, c2]) => {

    await t.step('case-1', async () => {
      await c1.execute("drop table if exists t");
      await c1.execute("create table t (i varchar(10), unique key(i))");
      await c1.execute("insert into t values ('a')");
      await c1.execute("begin pessimistic");
      await c1.execute("update t set i = 'a'");
      const res = c2.execute("insert into t values ('a')");
      await tk.assertResolveTimout(500, res);
      await c1.execute('rollback');
      await res.catch(assertIsError);
    });

    await t.step('case-2', async () => {
      await c1.execute("drop table if exists t");
      await c1.execute("create table t (k varchar(10), v int, primary key (k), key idx(k))");
      await c1.execute("insert into t values ('a', 10)");
      await c1.execute("begin pessimistic");
      await c1.execute("update t force index(idx) set v = 11 where k = 'a'");
      const res = c2.execute("insert into t values ('a', 100)");
      await tk.assertResolveTimout(500, res);
      await c1.execute('rollback');
      await res.catch(assertIsError);
    });

  });

});
