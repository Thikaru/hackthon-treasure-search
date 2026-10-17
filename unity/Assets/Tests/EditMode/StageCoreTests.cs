using NUnit.Framework;
using UnityEngine;

namespace TreasureStage.Tests
{
    public class StageCoreTests
    {
        [Test]
        public void ParsesCommandFromReact()
        {
            var c = StageCommand.Parse("{\"cmd\":\"\",\"scene\":\"reveal\",\"tod\":\"night\",\"kind\":\"bell\",\"fresh\":true}");
            Assert.AreEqual("reveal", c.scene);
            Assert.AreEqual("night", c.tod);
            Assert.AreEqual("bell", c.kind);
            Assert.IsTrue(c.fresh);
        }

        [Test]
        public void BrokenJsonFallsBackToDefaultChest()
        {
            var c = StageCommand.Parse("{not json");
            Assert.AreEqual("chest", c.scene);
            Assert.AreEqual("", c.cmd);
            Assert.AreEqual("chest", StageCommand.Parse(null).scene);
        }

        [Test]
        public void EasingStartsAndEndsInPlace()
        {
            foreach (var f in new System.Func<float, float>[] { Ease.OutCubic, Ease.InOutSine, t => Ease.OutBack(t) })
            {
                Assert.AreEqual(0f, f(0), 1e-4f);
                Assert.AreEqual(1f, f(1), 1e-4f);
            }
            Assert.Greater(Ease.OutBack(0.7f), 1f, "OutBack should overshoot");
            Assert.AreEqual(0f, Ease.Pulse(1), 1e-4f);
        }

        [Test]
        public void UnknownTimeOfDayUsesDayPalette()
        {
            var day = StagePalette.For("day");
            var x = StagePalette.For("midnight");
            Assert.AreEqual(day.light, x.light);
            Assert.AreNotEqual(day.light, StagePalette.For("night").light);
        }
    }
}
