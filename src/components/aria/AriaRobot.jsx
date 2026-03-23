/**
 * AriaRobot — thin wrapper per compatibilità con le vecchie chiamate.
 * Delega tutto a RobotARIA.
 */
import RobotARIA from './RobotARIA';
export default function AriaRobot({ color = '#3B6EF8', mood = 'felice', width = 100, height = 130 }) {
  return <RobotARIA size={width} color={color} mood={mood} animated={true} />;
}