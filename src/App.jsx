import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LogOut,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { hasSupabaseConfig, supabase, supabaseConfigError } from './lib/supabase';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSION_KEY = 'sweetwater-auth-user';
const LANGUAGE_KEY = 'sweetwater-language';
const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: (text) => text });
const spanish = {
  'Restaurant Employee Scheduling': 'Horario de empleados del restaurante', 'Name': 'Nombre',
  'Password or one-time passcode': 'Contraseña o código de un solo uso', 'Login': 'Iniciar sesión',
  'My schedule': 'Mi horario', 'Available shifts': 'Turnos disponibles', 'Request coverage': 'Solicitar cobertura',
  'Select your shift': 'Selecciona tu turno', 'Send to all eligible employees': 'Enviar a todos los empleados elegibles',
  'Full team schedule': 'Horario de todo el equipo', 'Calendar': 'Calendario', 'Request day off': 'Solicitar día libre',
  'Reason': 'Motivo', 'Send request': 'Enviar solicitud', 'Coverage available': 'Cobertura disponible',
  'My request status': 'Estado de mis solicitudes', 'No requests yet.': 'Aún no hay solicitudes.',
  'No open coverage requests.': 'No hay solicitudes de cobertura abiertas.', 'No available shifts right now.': 'No hay turnos disponibles ahora.',
  'No shifts scheduled.': 'No hay turnos programados.', 'No shifts': 'Sin turnos', 'Time off': 'Día libre',
  'Approved time off': 'Tiempo libre aprobado', 'Notifications': 'Notificaciones', 'Mark read': 'Marcar como leídas',
  'No notifications.': 'No hay notificaciones.', 'Request coverage button': 'Solicitar cobertura',
  'Accept': 'Aceptar', 'Requested': 'Solicitado', 'Servers only': 'Solo meseros', 'Ask to work': 'Pedir trabajar',
  'Mine': 'Mío', 'Team': 'Equipo', 'Ask': 'Solicitar', 'Logout': 'Salir', 'Home': 'Inicio', 'Staff': 'Personal',
  'Build': 'Crear', 'Pending': 'Pendiente', 'Approved': 'Aprobado', 'Denied': 'Denegado',
  'Add to home screen': 'Agregar a la pantalla de inicio', 'Connected to Supabase': 'Conectado a Supabase',
  'Previous week': 'Semana anterior', 'Next week': 'Semana siguiente', 'Coverage for': 'Cobertura para',
  'Sun': 'Dom', 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié', 'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sáb',
  'Approve': 'Aprobar', 'Deny': 'Denegar', 'Edit': 'Editar', 'Create shift': 'Crear turno', 'Edit shift': 'Editar turno',
  'Save shift': 'Guardar turno', 'Assign employee': 'Asignar empleado', 'Station': 'Puesto', 'Notes': 'Notas',
  'Employee list': 'Lista de empleados', 'Add employee': 'Agregar empleado', 'Passcode': 'Código',
  'Active staff': 'Personal activo', 'This week': 'Esta semana', 'Coverage': 'Cobertura', 'Week at a glance': 'Resumen semanal',
  'First time here? Enter your name and the one-time passcode your manager gave you. You will create your own password before entering the scheduler.': '¿Es tu primera vez? Escribe tu nombre y el código de un solo uso que te dio tu gerente. Crearás tu propia contraseña antes de entrar al horario.',
};

function App() {
  const [language, setLanguageState] = useState(() => localStorage.getItem(LANGUAGE_KEY) || 'en');
  const setLanguage = (nextLanguage) => {
    localStorage.setItem(LANGUAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };
  const value = useMemo(() => ({ language, setLanguage, t: (text) => language === 'es' ? (spanish[text] || text) : text }), [language]);
  return <LanguageContext.Provider value={value}><SchedulerApp /></LanguageContext.Provider>;
}

function useLanguage() {
  return useContext(LanguageContext);
}
const emptyData = {
  employees: [],
  shifts: [],
  timeOffRequests: [],
  coverageRequests: [],
  notifications: [],
};
const emptyShift = { employee_id: '', date: '', start_time: '16:00', end_time: '22:00', station: 'Dining Room', notes: '' };

function SchedulerApp() {
  const { language, setLanguage, t } = useLanguage();
  const [data, setData] = useState(emptyData);
  const [loadStatus, setLoadStatus] = useState(hasSupabaseConfig ? 'loading' : 'missing-config');
  const [loadError, setLoadError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [loginDraft, setLoginDraft] = useState({ email: '', credential: '' });
  const [loginError, setLoginError] = useState('');
  const [pendingPasswordUser, setPendingPasswordUser] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState({ password: '', confirm: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [weekOffset, setWeekOffset] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => isInstalledApp());
  const [shiftDraft, setShiftDraft] = useState(emptyShift);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [employeeDraft, setEmployeeDraft] = useState({ name: '', email: '', position: 'Server', role: 'employee', login_code: '' });
  const [timeOffDraft, setTimeOffDraft] = useState({ start_date: '', end_date: '', reason: '' });
  const [coverageDraft, setCoverageDraft] = useState({ shift_id: '', target_employee_id: 'all' });

  const currentUser = data.employees.find((employee) => employee.id === currentUserId);
  const isManager = currentUser?.role === 'manager';
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const visibleShifts = data.shifts
    .filter((shift) => weekDays.some((day) => day.iso === shift.date))
    .sort(sortShifts);
  const myShifts = visibleShifts.filter((shift) => shift.employee_id === currentUser?.id);
  const approvedTimeOff = data.timeOffRequests.filter((request) => request.status === 'Approved');
  const unreadCount = data.notifications.filter((note) => note.employee_id === currentUser?.id && !note.read).length;
  const changeLanguage = (nextLanguage) => {
    localStorage.setItem(`${LANGUAGE_KEY}:${currentUserId || 'guest'}`, nextLanguage);
    setLanguage(nextLanguage);
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem(`${LANGUAGE_KEY}:${currentUserId || 'guest'}`);
    if (savedLanguage && savedLanguage !== language) setLanguage(savedLanguage);
  }, [currentUserId]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    let isMounted = true;
    loadFromSupabase()
      .then((nextData) => {
        if (!isMounted) return;
        setData(nextData);
        setWeekOffset(getInitialWeekOffsetFromShifts(nextData.shifts));
        setLoadStatus('ready');
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Supabase data load failed.', error);
        setLoadError(error.message || 'Unable to load Supabase data.');
        setLoadStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Service worker registration failed.', error));
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const addNotification = async (employeeId, title, body) => {
    const notification = {
      employee_id: employeeId,
      title,
      body,
      read: false,
      created_at: new Date().toISOString(),
    };
    const { data: savedNotification, error } = await supabase.from('notifications').insert(notification).select('*').single();
    if (error) throw error;
    setData((current) => ({
      ...current,
      notifications: [savedNotification, ...current.notifications],
    }));
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    const loginCode = employeeDraft.login_code.trim();
    if (!loginCode) {
      showActionError(new Error('Create a one-time passcode before adding the employee.'));
      return;
    }

    const email = employeeDraft.email.trim() || buildEmployeeLoginEmail(employeeDraft.name, data.employees);
    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        active: true,
        name: employeeDraft.name.trim(),
        email,
        position: employeeDraft.position.trim(),
        role: employeeDraft.role,
        login_code: loginCode,
        must_change_password: true,
        password_hash: null,
        password_salt: null,
      })
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({ ...current, employees: [...current.employees, employee] }));
    setEmployeeDraft({ name: '', email: '', position: 'Server', role: 'employee', login_code: '' });
    window.alert(`${employee.name} was added. Give them this one-time passcode: ${loginCode}`);
  };

  const removeEmployee = async (id) => {
    const { error } = await supabase.from('employees').update({ active: false }).eq('id', id);
    if (error) return showActionError(error);
    const shiftDelete = await supabase.from('shifts').delete().eq('employee_id', id);
    if (shiftDelete.error) return showActionError(shiftDelete.error);
    const timeOffDelete = await supabase.from('time_off_requests').delete().eq('employee_id', id);
    if (timeOffDelete.error) return showActionError(timeOffDelete.error);
    const coverageDelete = await supabase.from('coverage_requests').delete().or(`requester_id.eq.${id},target_employee_id.eq.${id},accepted_by_id.eq.${id}`);
    if (coverageDelete.error) return showActionError(coverageDelete.error);
    const notificationDelete = await supabase.from('notifications').delete().eq('employee_id', id);
    if (notificationDelete.error) return showActionError(notificationDelete.error);
    setData((current) => ({
      ...current,
      employees: current.employees.map((employee) => (employee.id === id ? { ...employee, active: false } : employee)),
      shifts: current.shifts.filter((shift) => shift.employee_id !== id),
      timeOffRequests: current.timeOffRequests.filter((request) => request.employee_id !== id),
      coverageRequests: current.coverageRequests.filter((request) => request.requester_id !== id && request.target_employee_id !== id && request.accepted_by_id !== id),
      notifications: current.notifications.filter((note) => note.employee_id !== id),
    }));
  };

  const resetEmployeeCode = async (employee) => {
    const loginCode = window.prompt(`Enter a new one-time passcode for ${employee.name}:`)?.trim();
    if (!loginCode) {
      return;
    }

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update({
        login_code: loginCode,
        must_change_password: true,
        password_hash: null,
        password_salt: null,
      })
      .eq('id', employee.id)
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      employees: current.employees.map((item) => (item.id === employee.id ? updatedEmployee : item)),
    }));
    window.alert(`${updatedEmployee.name}'s one-time passcode is now: ${loginCode}`);
  };

  const saveShift = async (event) => {
    event.preventDefault();
    if (editingShiftId) {
      const { data: updatedShift, error } = await supabase.from('shifts').update(shiftDraft).eq('id', editingShiftId).select('*').single();
      if (error) return showActionError(error);
      setData((current) => ({
        ...current,
        shifts: current.shifts.map((shift) => (shift.id === editingShiftId ? updatedShift : shift)),
      }));
      setEditingShiftId(null);
    } else {
      const { data: newShift, error } = await supabase.from('shifts').insert(shiftDraft).select('*').single();
      if (error) return showActionError(error);
      setData((current) => ({
        ...current,
        shifts: [...current.shifts, newShift],
      }));
    }
    setShiftDraft(emptyShift);
  };

  const editShift = (shift) => {
    setEditingShiftId(shift.id);
    setShiftDraft({
      employee_id: shift.employee_id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      station: shift.station,
      notes: shift.notes,
    });
    setActiveTab('schedule');
  };

  const deleteShift = async (id) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== id),
      coverageRequests: current.coverageRequests.filter((request) => request.shift_id !== id),
    }));
  };

  const submitTimeOff = async (event) => {
    event.preventDefault();
    const { data: request, error } = await supabase
      .from('time_off_requests')
      .insert({ employee_id: currentUser.id, status: 'Pending', manager_note: '', ...timeOffDraft })
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({ ...current, timeOffRequests: [request, ...current.timeOffRequests] }));
    await notifyManagers('Time-off request pending', `${currentUser.name} requested ${formatDate(request.start_date)} off.`);
    setTimeOffDraft({ start_date: '', end_date: '', reason: '' });
  };

  const submitCoverage = async (event) => {
    event.preventDefault();
    const shift = data.shifts.find((item) => item.id === coverageDraft.shift_id);
    if (!shift) return showActionError(new Error('Select a shift before requesting coverage.'));
    const targetId = coverageDraft.target_employee_id === 'all' ? null : coverageDraft.target_employee_id;
    const { data: request, error } = await supabase.from('coverage_requests').insert({
      shift_id: coverageDraft.shift_id,
      requester_id: currentUser.id,
      target_employee_id: targetId,
      accepted_by_id: null,
      status: 'Pending',
      manager_note: '',
    }).select('*').single();
    if (error) return showActionError(error);
    setData((current) => ({ ...current, coverageRequests: [request, ...current.coverageRequests] }));
    const recipients = targetId ? [targetId] : data.employees.filter((employee) => employee.role === 'employee' && employee.id !== currentUser.id && !isOpenShiftEmployee(employee)).map((employee) => employee.id);
    await Promise.all(recipients.map((id) => addNotification(id, 'Coverage requested', `${currentUser.name} needs coverage for ${formatDate(shift.date)} ${shift.start_time}.`)));
    await notifyManagers('Coverage request started', `${currentUser.name} requested shift coverage.`);
    setCoverageDraft({ shift_id: '', target_employee_id: 'all' });
  };

  const acceptCoverage = async (requestId) => {
    const request = data.coverageRequests.find((item) => item.id === requestId);
    const shift = data.shifts.find((item) => item.id === request?.shift_id);
    const shiftEmployee = data.employees.find((employee) => employee.id === shift?.employee_id);
    if (isOpenShiftEmployee(shiftEmployee || { name: '' }) && isServingShift(shift) && !isServer(currentUser)) {
      return showActionError(new Error('Only servers can request an available serving shift.'));
    }

    const { data: updatedRequest, error } = await supabase.from('coverage_requests').update({ accepted_by_id: currentUser.id }).eq('id', requestId).select('*').single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      coverageRequests: current.coverageRequests.map((request) => (request.id === requestId ? updatedRequest : request)),
    }));
    await notifyManagers('Coverage accepted', `${currentUser.name} accepted a coverage request. Approval is needed.`);
  };


  const decideTimeOff = async (requestId, status) => {
    const request = data.timeOffRequests.find((item) => item.id === requestId);
    const { data: updatedRequest, error } = await supabase.from('time_off_requests').update({ status }).eq('id', requestId).select('*').single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      timeOffRequests: current.timeOffRequests.map((item) => (item.id === requestId ? updatedRequest : item)),
    }));
    await addNotification(request.employee_id, `Time off ${status.toLowerCase()}`, `Your request for ${formatDate(request.start_date)} is ${status.toLowerCase()}.`);
  };

  const decideCoverage = async (requestId, status) => {
    const request = data.coverageRequests.find((item) => item.id === requestId);
    const shift = data.shifts.find((item) => item.id === request.shift_id);
    const { data: updatedRequest, error } = await supabase.from('coverage_requests').update({ status }).eq('id', requestId).select('*').single();
    if (error) return showActionError(error);
    let updatedShift = shift;
    if (status === 'Approved' && request.accepted_by_id) {
      const shiftResult = await supabase.from('shifts').update({ employee_id: request.accepted_by_id }).eq('id', request.shift_id).select('*').single();
      if (shiftResult.error) return showActionError(shiftResult.error);
      updatedShift = shiftResult.data;
    }
    setData((current) => ({
      ...current,
      shifts: status === 'Approved' && request.accepted_by_id
        ? current.shifts.map((item) => (item.id === request.shift_id ? updatedShift : item))
        : current.shifts,
      coverageRequests: current.coverageRequests.map((item) => (item.id === requestId ? updatedRequest : item)),
    }));
    await addNotification(request.requester_id, `Coverage ${status.toLowerCase()}`, `${formatDate(shift.date)} coverage was ${status.toLowerCase()}.`);
    if (request.accepted_by_id) {
      await addNotification(request.accepted_by_id, `Coverage ${status.toLowerCase()}`, `${formatDate(shift.date)} coverage was ${status.toLowerCase()}.`);
    }
  };

  const reopenAvailableShift = async (requestId) => {
    const { data: updatedRequest, error } = await supabase
      .from('coverage_requests')
      .update({ status: 'Pending', accepted_by_id: null })
      .eq('id', requestId)
      .select('*')
      .single();
    if (error) return showActionError(error);
    setData((current) => ({
      ...current,
      coverageRequests: current.coverageRequests.map((request) => (request.id === requestId ? updatedRequest : request)),
    }));
  };

  const notifyManagers = async (title, body) => {
    await Promise.all(data.employees.filter((employee) => employee.role === 'manager').map((manager) => addNotification(manager.id, title, body)));
  };

  const markNotificationsRead = async () => {
    const unreadIds = data.notifications.filter((note) => note.employee_id === currentUser.id && !note.read).map((note) => note.id);
    if (unreadIds.length > 0) {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      if (error) return showActionError(error);
    }
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((note) => (note.employee_id === currentUser.id ? { ...note, read: true } : note)),
    }));
  };

  const finishLogin = (employee) => {
    setCurrentUserId(employee.id);
    sessionStorage.setItem(SESSION_KEY, employee.id);
    setActiveTab(employee.role === 'manager' ? 'dashboard' : 'mySchedule');
    setLoginDraft({ email: '', credential: '' });
    setLoginError('');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    const loginName = loginDraft.email.trim().toLowerCase();
    const employee = data.employees.find((item) => {
      const employeeName = item.name.toLowerCase();
      const employeeEmail = item.email.toLowerCase();
      return item.active && (employeeName === loginName || employeeEmail === loginName);
    });

    if (!employee) {
      setLoginError('No active employee was found for that name.');
      return;
    }

    if (employee.must_change_password !== false) {
      if (!employee.login_code) {
        setLoginError('This employee does not have a temporary login code. Ask a manager to create one.');
        return;
      }

      if (loginDraft.credential.trim() !== employee.login_code) {
        setLoginError('That temporary code is not correct.');
        return;
      }

      setPendingPasswordUser(employee);
      setPasswordDraft({ password: '', confirm: '' });
      return;
    }

    if (!employee.password_hash || !employee.password_salt) {
      setLoginError('This account needs a new temporary code from a manager.');
      return;
    }

    const hash = await hashPassword(loginDraft.credential, employee.password_salt);
    if (hash !== employee.password_hash) {
      setLoginError('That password is not correct.');
      return;
    }

    await supabase.from('employees').update({ last_login_at: new Date().toISOString() }).eq('id', employee.id);
    finishLogin(employee);
  };

  const handlePasswordSetup = async (event) => {
    event.preventDefault();
    setLoginError('');

    if (passwordDraft.password.length < 8) {
      setLoginError('Use at least 8 characters for the new password.');
      return;
    }

    if (passwordDraft.password !== passwordDraft.confirm) {
      setLoginError('The passwords do not match.');
      return;
    }

    const salt = generateLoginCode();
    const passwordHash = await hashPassword(passwordDraft.password, salt);
    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update({
        password_hash: passwordHash,
        password_salt: salt,
        login_code: null,
        must_change_password: false,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', pendingPasswordUser.id)
      .select('*')
      .single();

    if (error) {
      setLoginError(error.message);
      return;
    }

    setData((current) => ({
      ...current,
      employees: current.employees.map((employee) => (employee.id === updatedEmployee.id ? updatedEmployee : employee)),
    }));
    setPendingPasswordUser(null);
    finishLogin(updatedEmployee);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentUserId('');
    setActiveTab('dashboard');
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
      return;
    }

    window.alert('On iPhone or iPad, tap Share, then Add to Home Screen. On Android, open your browser menu and choose Install app or Add to Home screen.');
  };

  if (loadStatus === 'missing-config') {
    return <SetupState title="Supabase setup required" message={supabaseConfigError || 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart npm run dev.'} />;
  }

  if (loadStatus === 'loading') {
    return <SetupState title="Loading Sweetwater Grill Scheduler" message="Connecting to Supabase..." />;
  }

  if (loadStatus === 'error') {
    return <SetupState title="Supabase connection error" message={loadError} />;
  }

  if (data.employees.length === 0) {
    return <SetupState title="No employees found" message="Supabase is connected, but the employees table is empty. Add your manager record in Supabase to start scheduling." />;
  }

  if (pendingPasswordUser) {
    return (
      <PasswordSetupScreen
        employee={pendingPasswordUser}
        passwordDraft={passwordDraft}
        setPasswordDraft={setPasswordDraft}
        error={loginError}
        onSubmit={handlePasswordSetup}
      />
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        employees={data.employees}
        loginDraft={loginDraft}
        setLoginDraft={setLoginDraft}
        error={loginError}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-charcoal text-cream shadow-soft">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img
            className="h-12 w-12 rounded-full bg-cream object-contain"
            src="/logo.png"
            alt="Sweetwater Grill"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">{currentUser?.name}</p>
            <p className="text-xs text-cream/70">{currentUser?.position}</p>
          </div>
          <LanguageToggle language={language} setLanguage={changeLanguage} />
          <button className="relative rounded-full bg-ink p-2 text-cream" onClick={() => setActiveTab('notifications')} aria-label="Notifications">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-gold px-1.5 text-xs font-bold text-charcoal">{unreadCount}</span>}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4">
        <HomeIntro showInstallButton={!isStandalone} onInstall={handleInstallApp} />

        {activeTab === 'dashboard' && isManager && (
          <ManagerDashboard data={data} visibleShifts={visibleShifts} weekDays={weekDays} timeOffRequests={approvedTimeOff} onApproveTimeOff={decideTimeOff} onApproveCoverage={decideCoverage} onReopenAvailableShift={reopenAvailableShift} />
        )}
        {activeTab === 'employees' && isManager && (
          <EmployeesPanel employees={data.employees} employeeDraft={employeeDraft} setEmployeeDraft={setEmployeeDraft} onSave={saveEmployee} onRemove={removeEmployee} onResetCode={resetEmployeeCode} />
        )}
        {activeTab === 'schedule' && isManager && (
          <ScheduleBuilder
            employees={data.employees}
            shifts={visibleShifts}
            weekDays={weekDays}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            shiftDraft={shiftDraft}
            setShiftDraft={setShiftDraft}
            editingShiftId={editingShiftId}
            onSave={saveShift}
            onEdit={editShift}
            onDelete={deleteShift}
            timeOffRequests={approvedTimeOff}
          />
        )}
        {activeTab === 'mySchedule' && (
          <EmployeeSchedule
            currentUser={currentUser}
            employees={data.employees}
            shifts={visibleShifts}
            myShifts={myShifts}
            weekDays={weekDays}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            coverageDraft={coverageDraft}
            setCoverageDraft={setCoverageDraft}
            onCoverageSubmit={submitCoverage}
            coverageRequests={data.coverageRequests}
            onAcceptCoverage={acceptCoverage}
            timeOffRequests={approvedTimeOff.filter((request) => request.employee_id === currentUser.id)}
          />
        )}
        {activeTab === 'teamSchedule' && <TeamSchedule employees={data.employees} shifts={visibleShifts} weekDays={weekDays} timeOffRequests={approvedTimeOff} />}
        {activeTab === 'calendar' && (
          <CalendarPanel
            employees={data.employees}
            shifts={visibleShifts}
            weekDays={weekDays}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            timeOffRequests={approvedTimeOff}
          />
        )}
        {activeTab === 'requests' && (
          <RequestsPanel
            currentUser={currentUser}
            employees={data.employees}
            shifts={data.shifts}
            weekDays={weekDays}
            timeOffRequests={data.timeOffRequests}
            coverageRequests={data.coverageRequests}
            timeOffDraft={timeOffDraft}
            setTimeOffDraft={setTimeOffDraft}
            onTimeOffSubmit={submitTimeOff}
            onAcceptCoverage={acceptCoverage}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsPanel notifications={data.notifications.filter((note) => note.employee_id === currentUser.id)} onRead={markNotificationsRead} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-charcoal/10 bg-paper/95 px-2 py-2 shadow-soft backdrop-blur safe-bottom">
        <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1">
          {isManager ? (
            <>
              <NavButton icon={ShieldCheck} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              <NavButton icon={UsersRound} label="Staff" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
              <NavButton icon={CalendarDays} label="Build" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} />
              <NavButton icon={CalendarDays} label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            </>
          ) : (
            <>
              <NavButton icon={UserRound} label="Mine" active={activeTab === 'mySchedule'} onClick={() => setActiveTab('mySchedule')} />
              <NavButton icon={CalendarDays} label="Calendar" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
              <NavButton icon={UsersRound} label="Team" active={activeTab === 'teamSchedule'} onClick={() => setActiveTab('teamSchedule')} />
              <NavButton icon={Send} label="Ask" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
            </>
          )}
          <NavButton icon={LogOut} label="Logout" active={false} onClick={handleLogout} />
        </div>
      </nav>
    </div>
  );
}

function HomeIntro({ showInstallButton, onInstall }) {
  return (
    <section className="mb-4 rounded-lg bg-charcoal p-4 text-cream shadow-soft">
      <div className="flex items-center gap-3">
        <img
          className="h-16 w-28 rounded-md bg-cream object-contain p-1"
          src="/logo.png"
          alt="Sweetwater Grill logo"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight">Sweetwater Grill Scheduler</h1>
          <p className="text-sm font-semibold text-cream/75">Restaurant Employee Scheduling</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="rounded-md bg-green/20 px-3 py-2 text-sm text-cream">Connected to Supabase</p>
        {showInstallButton && (
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-black text-charcoal" onClick={onInstall}>
            <Download size={17} /> Add to home screen
          </button>
        )}
      </div>
    </section>
  );
}

function AuthScreen({ loginDraft, setLoginDraft, error, onSubmit }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
      <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
        <img
          className="mb-4 h-20 w-20 rounded-full object-contain"
          src="/logo.png"
          alt="Sweetwater Grill"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-2xl font-black">Sweetwater Grill Scheduler</h1><p className="mt-1 font-semibold text-charcoal/70">{t('Restaurant Employee Scheduling')}</p></div>
          <LanguageToggle language={language} setLanguage={setLanguage} dark />
        </div>
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-bold">
            {t('Name')}
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="text"
              value={loginDraft.email}
              onChange={(event) => setLoginDraft({ ...loginDraft, email: event.target.value })}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {t('Password or one-time passcode')}
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="password"
              value={loginDraft.credential}
              onChange={(event) => setLoginDraft({ ...loginDraft, credential: event.target.value })}
              required
            />
          </label>
          {error && <p className="rounded-md bg-orange/15 p-3 text-sm font-semibold text-orange">{error}</p>}
          <button className="rounded-md bg-teal px-4 py-3 font-bold text-white">{t('Login')}</button>
        </form>
        <p className="mt-4 rounded-md bg-gold/20 p-3 text-sm text-charcoal/70">{t('First time here? Enter your name and the one-time passcode your manager gave you. You will create your own password before entering the scheduler.')}</p>
      </section>
    </main>
  );
}

function LanguageToggle({ language, setLanguage, dark = false }) {
  return (
    <div className={`flex shrink-0 rounded-md p-1 text-xs font-black ${dark ? 'bg-charcoal/10 text-charcoal' : 'bg-white/10 text-cream'}`} aria-label="Language / Idioma">
      <button className={`rounded px-2 py-1 ${language === 'en' ? 'bg-teal text-white' : ''}`} onClick={() => setLanguage('en')} type="button">EN</button>
      <button className={`rounded px-2 py-1 ${language === 'es' ? 'bg-teal text-white' : ''}`} onClick={() => setLanguage('es')} type="button">ES</button>
    </div>
  );
}

function PasswordSetupScreen({ employee, passwordDraft, setPasswordDraft, error, onSubmit }) {
  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
      <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
        <img
          className="mb-4 h-20 w-20 rounded-full object-contain"
          src="/logo.png"
          alt="Sweetwater Grill"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="text-2xl font-black">Create your password</h1>
        <p className="mt-1 font-semibold text-charcoal/70">{employee.name}</p>
        <form className="mt-5 grid gap-3" onSubmit={onSubmit}>
          <label className="grid gap-1 text-sm font-bold">
            New password
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="password"
              minLength={8}
              value={passwordDraft.password}
              onChange={(event) => setPasswordDraft({ ...passwordDraft, password: event.target.value })}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Confirm password
            <input
              className="rounded-md border border-charcoal/15 bg-white px-3 py-3 text-base font-normal"
              type="password"
              minLength={8}
              value={passwordDraft.confirm}
              onChange={(event) => setPasswordDraft({ ...passwordDraft, confirm: event.target.value })}
              required
            />
          </label>
          {error && <p className="rounded-md bg-orange/15 p-3 text-sm font-semibold text-orange">{error}</p>}
          <button className="rounded-md bg-green px-4 py-3 font-bold text-white">Save password</button>
        </form>
      </section>
    </main>
  );
}

function SetupState({ title, message }) {
  return (
    <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
      <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
        <img
          className="mb-4 h-20 w-20 rounded-full object-contain"
          src="/logo.png"
          alt="Sweetwater Grill"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        <h1 className="text-2xl font-black">Sweetwater Grill Scheduler</h1>
        <p className="mt-1 font-semibold text-charcoal/70">Restaurant Employee Scheduling</p>
        <div className="mt-4 rounded-md bg-gold/20 p-3">
          <p className="font-bold">{title}</p>
          <p className="mt-1 text-sm text-charcoal/70">{message}</p>
        </div>
      </section>
    </main>
  );
}

function ManagerDashboard({ data, visibleShifts, weekDays, timeOffRequests, onApproveTimeOff, onApproveCoverage, onReopenAvailableShift }) {
  const pendingTimeOff = data.timeOffRequests.filter((request) => request.status === 'Pending');
  const pendingCoverage = data.coverageRequests.filter((request) => request.status === 'Pending');
  const deniedAvailableShifts = data.coverageRequests.filter((request) => {
    const shift = data.shifts.find((item) => item.id === request.shift_id);
    const employee = data.employees.find((item) => item.id === shift?.employee_id);
    return request.status === 'Denied' && isOpenShiftEmployee(employee || { name: '' });
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Active staff" value={data.employees.filter((employee) => employee.active && !isOpenShiftEmployee(employee)).length} />
        <Metric label="This week" value={visibleShifts.length} />
        <Metric label="Time off" value={pendingTimeOff.length} />
        <Metric label="Coverage" value={pendingCoverage.length} />
      </div>
      <ApprovalScreen
        employees={data.employees}
        shifts={data.shifts}
        timeOffRequests={pendingTimeOff}
        coverageRequests={pendingCoverage}
        deniedAvailableShifts={deniedAvailableShifts}
        onApproveTimeOff={onApproveTimeOff}
        onApproveCoverage={onApproveCoverage}
        onReopenAvailableShift={onReopenAvailableShift}
      />
      <SectionTitle icon={CalendarDays} title="Week at a glance" />
      <ScheduleList employees={data.employees} shifts={visibleShifts} weekDays={weekDays} timeOffRequests={timeOffRequests} />
    </div>
  );
}

function ApprovalScreen({ employees, shifts, timeOffRequests, coverageRequests, deniedAvailableShifts, onApproveTimeOff, onApproveCoverage, onReopenAvailableShift }) {
  return (
    <section className="rounded-lg bg-charcoal p-4 text-cream shadow-soft">
      <SectionTitle icon={ShieldCheck} title="Manager approvals" light />
      <div className="space-y-3">
        {timeOffRequests.map((request) => (
          <ApprovalItem key={request.id} title={`${nameFor(employees, request.employee_id)} wants time off`} detail={`${formatDate(request.start_date)} to ${formatDate(request.end_date)} - ${request.reason}`} onApprove={() => onApproveTimeOff(request.id, 'Approved')} onDeny={() => onApproveTimeOff(request.id, 'Denied')} />
        ))}
        {coverageRequests.map((request) => {
          const shift = shifts.find((item) => item.id === request.shift_id);
          const isOpenShiftRequest = isOpenShiftEmployee(employees.find((employee) => employee.id === shift?.employee_id) || { name: '' });
          return (
            <ApprovalItem
              key={request.id}
              title={isOpenShiftRequest ? `${request.accepted_by_id ? nameFor(employees, request.accepted_by_id) : 'Someone'} asked for an available shift` : `${nameFor(employees, request.requester_id)} requested coverage`}
              detail={`${shift ? `${formatDate(shift.date)} ${formatTimeRange(shift)}` : 'Shift'} accepted by ${request.accepted_by_id ? nameFor(employees, request.accepted_by_id) : 'no one yet'}`}
              disabled={!request.accepted_by_id}
              onApprove={() => onApproveCoverage(request.id, 'Approved')}
              onDeny={() => onApproveCoverage(request.id, 'Denied')}
            />
          );
        })}
        {timeOffRequests.length === 0 && coverageRequests.length === 0 && <p className="rounded-md bg-white/10 p-3 text-sm text-cream/75">No pending approvals.</p>}
        {deniedAvailableShifts.length > 0 && (
          <div className="space-y-2 border-t border-white/15 pt-3">
            <p className="text-sm font-bold text-cream/75">Denied available shifts</p>
            {deniedAvailableShifts.map((request) => {
              const shift = shifts.find((item) => item.id === request.shift_id);
              return (
                <div key={request.id} className="flex items-center gap-3 rounded-md bg-white/10 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{shift ? `${formatDate(shift.date)} ${formatTimeRange(shift)}` : 'Unavailable shift'}</p>
                    <p className="text-sm text-cream/70">{shift?.station || 'Open shift'}</p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-md bg-gold px-3 py-2 font-bold text-charcoal" onClick={() => onReopenAvailableShift(request.id)}>
                    <RotateCcw size={17} /> Reopen
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function EmployeesPanel({ employees, employeeDraft, setEmployeeDraft, onSave, onRemove, onResetCode }) {
  const visibleEmployees = employees.filter((employee) => !isOpenShiftEmployee(employee));
  return (
    <div className="space-y-4">
      <SectionTitle icon={UsersRound} title="Employee list" />
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onSave}>
        <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="Name" value={employeeDraft.name} onChange={(event) => setEmployeeDraft({ ...employeeDraft, name: event.target.value })} required />
        <input className="rounded-md border border-charcoal/15 px-3 py-3" type="email" placeholder="Email optional" value={employeeDraft.email} onChange={(event) => setEmployeeDraft({ ...employeeDraft, email: event.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="Position" value={employeeDraft.position} onChange={(event) => setEmployeeDraft({ ...employeeDraft, position: event.target.value })} required />
          <select className="rounded-md border border-charcoal/15 px-3 py-3" value={employeeDraft.role} onChange={(event) => setEmployeeDraft({ ...employeeDraft, role: event.target.value })}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="One-time passcode" value={employeeDraft.login_code} onChange={(event) => setEmployeeDraft({ ...employeeDraft, login_code: event.target.value })} required />
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-teal px-4 py-3 font-bold text-white"><Plus size={18} /> Add employee</button>
      </form>
      <div className="space-y-2">
        {visibleEmployees.map((employee) => (
          <div key={employee.id} className={`flex items-center gap-3 rounded-lg bg-paper p-3 shadow-soft ${employee.active ? '' : 'opacity-50'}`}>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-green text-sm font-bold text-white">{initials(employee.name)}</div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{employee.name}</p>
              <p className="text-sm text-charcoal/65">{employee.position} - {employee.role}</p>
              {employee.must_change_password && <p className="text-xs font-bold text-gold">One-time passcode required</p>}
            </div>
            <button className="rounded-md bg-teal/10 px-3 py-2 text-sm font-bold text-teal" onClick={() => onResetCode(employee)}>Passcode</button>
            {employee.role !== 'manager' && <button className="rounded-md bg-orange/10 p-2 text-orange" onClick={() => onRemove(employee.id)} aria-label={`Deactivate ${employee.name}`}><Trash2 size={18} /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleBuilder(props) {
  const { employees, shifts, weekDays, weekOffset, setWeekOffset, shiftDraft, setShiftDraft, editingShiftId, onSave, onEdit, onDelete, timeOffRequests } = props;
  return (
    <div className="space-y-4">
      <WeekControls weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onSave}>
        <SectionTitle icon={Clock} title={editingShiftId ? 'Edit shift' : 'Create shift'} />
        <select className="rounded-md border border-charcoal/15 px-3 py-3" value={shiftDraft.employee_id} onChange={(event) => setShiftDraft({ ...shiftDraft, employee_id: event.target.value })} required>
          <option value="">Assign employee</option>
          {employees.filter((employee) => employee.active && employee.role === 'employee' && !isOpenShiftEmployee(employee)).map((employee) => <option key={employee.id} value={employee.id}>{employee.name} - {employee.position}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="date" value={shiftDraft.date} onChange={(event) => setShiftDraft({ ...shiftDraft, date: event.target.value })} required />
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="time" value={shiftDraft.start_time} onChange={(event) => setShiftDraft({ ...shiftDraft, start_time: event.target.value })} required />
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="time" value={shiftDraft.end_time} onChange={(event) => setShiftDraft({ ...shiftDraft, end_time: event.target.value })} required />
        </div>
        <input className="rounded-md border border-charcoal/15 px-3 py-3" placeholder="Station" value={shiftDraft.station} onChange={(event) => setShiftDraft({ ...shiftDraft, station: event.target.value })} required />
        <textarea className="min-h-20 rounded-md border border-charcoal/15 px-3 py-3" placeholder="Notes" value={shiftDraft.notes} onChange={(event) => setShiftDraft({ ...shiftDraft, notes: event.target.value })} />
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-green px-4 py-3 font-bold text-white"><Check size={18} /> {editingShiftId ? 'Save shift' : 'Create shift'}</button>
      </form>
      <ScheduleList employees={employees} shifts={shifts} weekDays={weekDays} timeOffRequests={timeOffRequests} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function EmployeeSchedule({ currentUser, employees, shifts, myShifts, weekDays, weekOffset, setWeekOffset, coverageDraft, setCoverageDraft, onCoverageSubmit, coverageRequests, onAcceptCoverage, timeOffRequests }) {
  const { t } = useLanguage();
  const eligible = employees.filter((employee) => employee.role === 'employee' && employee.active && employee.id !== currentUser.id && !isOpenShiftEmployee(employee));
  return (
    <div className="space-y-4">
      <WeekControls weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
      <SectionTitle icon={UserRound} title={t('My schedule')} />
      <ScheduleList employees={employees} shifts={myShifts} weekDays={weekDays} timeOffRequests={timeOffRequests} />
      <OpenShiftList currentUser={currentUser} employees={employees} shifts={shifts} coverageRequests={coverageRequests} weekDays={weekDays} onRequest={onAcceptCoverage} />
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onCoverageSubmit}>
        <SectionTitle icon={Send} title="Request coverage" />
        <select className="rounded-md border border-charcoal/15 px-3 py-3" value={coverageDraft.shift_id} onChange={(event) => setCoverageDraft({ ...coverageDraft, shift_id: event.target.value })} required>
          <option value="">{t('Select your shift')}</option>
          {myShifts.map((shift) => <option key={shift.id} value={shift.id}>{formatDate(shift.date)} {formatTimeRange(shift)} {shift.station}</option>)}
        </select>
        <select className="rounded-md border border-charcoal/15 px-3 py-3" value={coverageDraft.target_employee_id} onChange={(event) => setCoverageDraft({ ...coverageDraft, target_employee_id: event.target.value })}>
          <option value="all">{t('Send to all eligible employees')}</option>
          {eligible.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
        </select>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 font-bold text-charcoal"><Send size={18} /> {t('Request coverage')}</button>
      </form>
    </div>
  );
}

function TeamSchedule({ employees, shifts, weekDays, timeOffRequests }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <SectionTitle icon={UsersRound} title={t('Full team schedule')} />
      <ScheduleList employees={employees} shifts={shifts} weekDays={weekDays} timeOffRequests={timeOffRequests} />
    </div>
  );
}

function OpenShiftList({ currentUser, employees, shifts, coverageRequests, weekDays, onRequest }) {
  const { t } = useLanguage();
  const openEmployeeId = employees.find((employee) => isOpenShiftEmployee(employee))?.id;
  const visibleOpenRequests = coverageRequests
    .filter((request) => {
      const shift = shifts.find((item) => item.id === request.shift_id);
      return request.status === 'Pending'
        && !request.accepted_by_id
        && shift?.employee_id === openEmployeeId
        && weekDays.some((day) => day.iso === shift.date);
    })
    .sort((a, b) => {
      const shiftA = shifts.find((shift) => shift.id === a.shift_id);
      const shiftB = shifts.find((shift) => shift.id === b.shift_id);
      return sortShifts(shiftA, shiftB);
    });

  return (
    <section className="space-y-2">
      <SectionTitle icon={Clock} title="Available shifts" />
      {visibleOpenRequests.map((request) => {
        const shift = shifts.find((item) => item.id === request.shift_id);
        const alreadyRequested = request.accepted_by_id === currentUser.id;
        const serversOnly = isServingShift(shift) && !isServer(currentUser);
        return (
          <div key={request.id} className="flex items-center gap-3 rounded-lg bg-paper p-3 shadow-soft">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{formatDate(shift.date)} {formatTimeRange(shift)}</p>
              <p className="text-sm text-charcoal/65">{shift.station}</p>
            </div>
            <button
              className="rounded-md bg-green px-3 py-2 text-sm font-bold text-white disabled:opacity-45"
              disabled={alreadyRequested || serversOnly}
              onClick={() => onRequest(request.id)}
              title={serversOnly ? 'Only servers can request serving shifts' : undefined}
            >
              {alreadyRequested ? t('Requested') : serversOnly ? t('Servers only') : t('Ask to work')}
            </button>
          </div>
        );
      })}
      {visibleOpenRequests.length === 0 && <EmptyState text="No available shifts right now." />}
    </section>
  );
}

function CalendarPanel({ employees, shifts, weekDays, weekOffset, setWeekOffset, timeOffRequests }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <WeekControls weekDays={weekDays} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
      <SectionTitle icon={CalendarDays} title={t('Calendar')} />
      <WeekCalendar employees={employees} shifts={shifts} weekDays={weekDays} timeOffRequests={timeOffRequests} />
    </div>
  );
}

function WeekCalendar({ employees, shifts, weekDays, timeOffRequests = [] }) {
  const { t } = useLanguage();
  return (
    <section className="overflow-x-auto rounded-lg bg-paper p-3 shadow-soft">
      <div className="grid min-w-[48rem] grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter((shift) => shift.date === day.iso);
          const dayTimeOff = timeOffRequests.filter((request) => dateIsInRange(day.iso, request.start_date, request.end_date));
          return (
            <div key={day.iso} className="min-h-80 rounded-md border border-charcoal/10 bg-white">
              <div className="border-b border-charcoal/10 bg-cream px-3 py-2">
                <p className="text-sm font-black">{dayNames[day.date.getDay()]}</p>
                <p className="text-xs font-semibold text-charcoal/60">{formatDate(day.iso)}</p>
              </div>
              <div className="space-y-2 p-2">
                {dayShifts.map((shift) => (
                  <div key={shift.id} className="rounded-md bg-teal/10 p-2">
                    <p className="truncate text-sm font-black text-charcoal">{nameFor(employees, shift.employee_id)}</p>
                    <p className="text-xs font-bold text-teal">{formatTimeRange(shift)}</p>
                    <p className="truncate text-xs text-charcoal/60">{shift.station}</p>
                  </div>
                ))}
                {dayTimeOff.map((request) => <div key={`off-${request.id}`} className="rounded-md bg-orange/10 p-2"><p className="truncate text-sm font-black text-charcoal">{nameFor(employees, request.employee_id)}</p><p className="text-xs font-bold text-orange">{t('Time off')}</p></div>)}
                {dayShifts.length === 0 && dayTimeOff.length === 0 && <p className="rounded-md bg-cream p-2 text-xs text-charcoal/55">{t('No shifts')}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RequestsPanel({ currentUser, employees, shifts, weekDays, timeOffRequests, coverageRequests, timeOffDraft, setTimeOffDraft, onTimeOffSubmit, onAcceptCoverage }) {
  const { t } = useLanguage();
  const openCoverage = coverageRequests.filter((request) => request.status === 'Pending' && !request.accepted_by_id && request.requester_id !== currentUser.id && (!request.target_employee_id || request.target_employee_id === currentUser.id));
  const myRequests = [...timeOffRequests.filter((request) => request.employee_id === currentUser.id), ...coverageRequests.filter((request) => request.requester_id === currentUser.id || request.accepted_by_id === currentUser.id)];
  return (
    <div className="space-y-4">
      <form className="grid gap-2 rounded-lg bg-paper p-3 shadow-soft" onSubmit={onTimeOffSubmit}>
        <SectionTitle icon={CalendarDays} title="Request day off" />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="date" value={timeOffDraft.start_date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, start_date: event.target.value })} required />
          <input className="rounded-md border border-charcoal/15 px-3 py-3" type="date" value={timeOffDraft.end_date} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, end_date: event.target.value })} required />
        </div>
        <textarea className="min-h-20 rounded-md border border-charcoal/15 px-3 py-3" placeholder={t('Reason')} value={timeOffDraft.reason} onChange={(event) => setTimeOffDraft({ ...timeOffDraft, reason: event.target.value })} required />
        <button className="rounded-md bg-teal px-4 py-3 font-bold text-white">{t('Send request')}</button>
      </form>
      <OpenShiftList currentUser={currentUser} employees={employees} shifts={shifts} coverageRequests={coverageRequests} weekDays={weekDays} onRequest={onAcceptCoverage} />
      <SectionTitle icon={Send} title="Coverage available" />
      <div className="space-y-2">
        {openCoverage.map((request) => {
          const shift = shifts.find((item) => item.id === request.shift_id);
          return (
            <div key={request.id} className="rounded-lg bg-paper p-3 shadow-soft">
              <p className="font-bold">{nameFor(employees, request.requester_id)} needs coverage</p>
              <p className="text-sm text-charcoal/65">{shift ? `${formatDate(shift.date)} ${formatTimeRange(shift)} ${shift.station}` : 'Shift unavailable'}</p>
              <button className="mt-3 rounded-md bg-green px-4 py-2 font-bold text-white" onClick={() => onAcceptCoverage(request.id)}>{t('Accept')}</button>
            </div>
          );
        })}
        {openCoverage.length === 0 && <EmptyState text="No open coverage requests." />}
      </div>
      <SectionTitle icon={Clock} title="My request status" />
      <div className="space-y-2">
        {myRequests.map((request) => (
          <div key={request.id} className="rounded-lg bg-paper p-3 shadow-soft">
            <StatusBadge status={request.status} />
            <p className="mt-2 text-sm text-charcoal/70">{request.start_date ? `${formatDate(request.start_date)} to ${formatDate(request.end_date)}` : `Coverage for ${formatDate(shifts.find((shift) => shift.id === request.shift_id)?.date)}`}</p>
          </div>
        ))}
        {myRequests.length === 0 && <EmptyState text="No requests yet." />}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications, onRead }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Bell} title="Notifications" />
        <button className="rounded-md bg-charcoal px-3 py-2 text-sm font-bold text-cream" onClick={onRead}>Mark read</button>
      </div>
      <div className="space-y-2">
        {notifications.map((note) => (
          <div key={note.id} className={`rounded-lg p-3 shadow-soft ${note.read ? 'bg-paper' : 'bg-teal text-white'}`}>
            <p className="font-bold">{note.title}</p>
            <p className={note.read ? 'text-sm text-charcoal/65' : 'text-sm text-white/80'}>{note.body}</p>
          </div>
        ))}
        {notifications.length === 0 && <EmptyState text="No notifications." />}
      </div>
    </div>
  );
}

function ScheduleList({ employees, shifts, weekDays, timeOffRequests = [], onEdit, onDelete }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      {weekDays.map((day) => {
        const dayShifts = shifts.filter((shift) => shift.date === day.iso);
        const dayTimeOff = timeOffRequests.filter((request) => dateIsInRange(day.iso, request.start_date, request.end_date));
        return (
          <section key={day.iso} className="rounded-lg bg-paper p-3 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{dayNames[day.date.getDay()]} <span className="text-charcoal/55">{formatDate(day.iso)}</span></p>
              <span className="rounded-full bg-cream px-2 py-1 text-xs font-bold text-charcoal/65">{dayShifts.length} shifts</span>
            </div>
            <div className="space-y-2">
              {dayShifts.map((shift) => (
                <div key={shift.id} className="rounded-md border border-charcoal/10 bg-white p-3">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal text-sm font-bold text-white">{initials(nameFor(employees, shift.employee_id))}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{nameFor(employees, shift.employee_id)}</p>
                      <p className="text-sm text-charcoal/65">{formatTimeRange(shift)} - {shift.station}</p>
                      {displayShiftNote(shift) && <p className="mt-1 text-sm text-charcoal/55">{displayShiftNote(shift)}</p>}
                    </div>
                    {onEdit && (
                      <div className="flex gap-1">
                        <button className="h-9 rounded-md bg-gold/15 px-3 text-sm font-bold text-charcoal" onClick={() => onEdit(shift)}>Edit</button>
                        <button className="grid h-9 w-9 place-items-center rounded-md bg-orange/10 text-orange" onClick={() => onDelete(shift.id)} aria-label="Delete shift"><Trash2 size={17} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {dayTimeOff.map((request) => (
                <div key={`off-${request.id}`} className="rounded-md border border-orange/20 bg-orange/10 p-3">
                  <div className="flex gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange text-sm font-bold text-white">{initials(nameFor(employees, request.employee_id))}</div>
                    <div><p className="font-bold">{nameFor(employees, request.employee_id)}</p><p className="text-sm font-bold text-orange">{t('Approved time off')}</p>{request.reason && <p className="mt-1 text-sm text-charcoal/55">{request.reason}</p>}</div>
                  </div>
                </div>
              ))}
              {dayShifts.length === 0 && dayTimeOff.length === 0 && <p className="rounded-md bg-cream p-3 text-sm text-charcoal/55">{t('No shifts scheduled.')}</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ApprovalItem({ title, detail, onApprove, onDeny, disabled }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="font-bold">{title}</p>
      <p className="text-sm text-cream/70">{detail}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-green px-3 py-2 font-bold text-white disabled:opacity-40" disabled={disabled} onClick={onApprove}><Check size={17} /> {t('Approve')}</button>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-orange px-3 py-2 font-bold text-white" onClick={onDeny}><X size={17} /> {t('Deny')}</button>
      </div>
    </div>
  );
}

function WeekControls({ weekDays, weekOffset, setWeekOffset }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between rounded-lg bg-charcoal p-3 text-cream shadow-soft">
      <button className="rounded-md bg-white/10 p-2" onClick={() => setWeekOffset(weekOffset - 1)} aria-label={t('Previous week')}><ChevronLeft size={19} /></button>
      <p className="text-center text-sm font-bold">{formatDate(weekDays[0].iso)} - {formatDate(weekDays[6].iso)}</p>
      <button className="rounded-md bg-white/10 p-2" onClick={() => setWeekOffset(weekOffset + 1)} aria-label={t('Next week')}><ChevronRight size={19} /></button>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  const { t } = useLanguage();
  return (
    <button className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs font-bold ${active ? 'bg-teal text-white' : 'text-charcoal/65'}`} onClick={onClick}>
      <Icon size={19} />
      <span>{t(label)}</span>
    </button>
  );
}

function Metric({ label, value }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-lg bg-paper p-3 shadow-soft">
      <p className="text-2xl font-black text-charcoal">{value}</p>
      <p className="text-sm font-semibold text-charcoal/60">{t(label)}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, light }) {
  const { t } = useLanguage();
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className={light ? 'text-gold' : 'text-teal'} size={19} />
      <h2 className={`text-base font-black ${light ? 'text-cream' : 'text-charcoal'}`}>{t(title)}</h2>
    </div>
  );
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const classes = {
    Pending: 'bg-gold/20 text-charcoal',
    Approved: 'bg-green/15 text-green',
    Denied: 'bg-orange/15 text-orange',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${classes[status]}`}>{t(status)}</span>;
}

function EmptyState({ text }) {
  const { t } = useLanguage();
  return <p className="rounded-lg bg-paper p-4 text-sm text-charcoal/60 shadow-soft">{t(text)}</p>;
}

function showActionError(error) {
  console.error('Supabase action failed.', error);
  window.alert(error.message || 'The action could not be saved to Supabase.');
}

async function sendEmployeeInvite(employee, loginCode) {
  const { error } = await supabase.functions.invoke('send-employee-invite', {
    body: {
      email: employee.email,
      name: employee.name,
      loginCode,
      appUrl: window.location.origin,
    },
  });

  if (error) {
    console.warn('Invite email failed.', error);
    window.alert(`Employee saved, but the invite email could not be sent. Give ${employee.name} this temporary code: ${loginCode}`);
    return;
  }

  window.alert(`Employee saved. Invite email sent to ${employee.email}.`);
}

function generateLoginCode() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `SWG-${code}`;
}

function buildEmployeeLoginEmail(name, employees) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'employee';
  const existingEmails = new Set(employees.map((employee) => employee.email.toLowerCase()));
  let candidate = `${base}@sweetwater.local`;
  let suffix = 2;

  while (existingEmails.has(candidate)) {
    candidate = `${base}.${suffix}@sweetwater.local`;
    suffix += 1;
  }

  return candidate;
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function loadFromSupabase() {
  const [employeesResult, shiftsResult, timeOffResult, coverageResult, notificationsResult] = await Promise.all([
    supabase.from('employees').select('*').order('name'),
    supabase.from('shifts').select('*').order('date'),
    supabase.from('time_off_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('coverage_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
  ]);

  const error = employeesResult.error || shiftsResult.error || timeOffResult.error || coverageResult.error || notificationsResult.error;
  if (error) throw error;

  return {
    employees: employeesResult.data || [],
    shifts: shiftsResult.data || [],
    timeOffRequests: timeOffResult.data || [],
    coverageRequests: coverageResult.data || [],
    notifications: notificationsResult.data || [],
  };
}

function getWeekDays(offset) {
  const today = new Date();
  const monday = new Date(today);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - daysSinceMonday + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { date, iso: toIsoDate(date) };
  });
}

function sortShifts(a, b) {
  return `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return 'Unscheduled';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
}

function formatTime(value) {
  if (!value) return '';
  const [hourPart, minutePart] = value.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const standardHour = hour % 12 || 12;
  return `${standardHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(shift) {
  if (isScheduleTimeLabel(shift.notes)) {
    return shift.notes;
  }

  return `${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`;
}

function isScheduleTimeLabel(value) {
  return ['Open-Close', 'Open-3:00 PM', '3:00 PM-Close', '4:00 PM-Close', '12:00 PM-2:00 PM', '1:00 PM-Close', 'Whenever'].includes(value);
}

function displayShiftNote(shift) {
  return isScheduleTimeLabel(shift.notes) ? '' : shift.notes;
}

function getInitialWeekOffsetFromShifts(shifts) {
  if (!shifts.length) {
    return 0;
  }

  const countsByWeek = shifts.reduce((counts, shift) => {
    const weekStart = toIsoDate(getMonday(fromIsoDate(shift.date)));
    counts[weekStart] = (counts[weekStart] || 0) + 1;
    return counts;
  }, {});
  const [bestWeekStart] = Object.entries(countsByWeek).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return getWeekOffsetForDate(bestWeekStart);
}

function getWeekOffsetForDate(value) {
  const todayMonday = getMonday(new Date());
  const targetMonday = getMonday(fromIsoDate(value));
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.round((targetMonday - todayMonday) / millisecondsPerWeek);
}

function getMonday(date) {
  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
}

function fromIsoDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateIsInRange(date, startDate, endDate) {
  return Boolean(date && startDate && endDate && date >= startDate && date <= endDate);
}

function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isOpenShiftEmployee(employee) {
  return employee.name.trim().toLowerCase() === 'open shift';
}

function isServer(employee) {
  return employee?.position?.trim().toLowerCase() === 'server';
}

function isServingShift(shift) {
  return shift?.station?.trim().toLowerCase() === 'server';
}

function nameFor(employees, id) {
  const employee = employees.find((item) => item.id === id);
  if (!employee) {
    return 'Unassigned';
  }
  return isOpenShiftEmployee(employee) ? 'Available shift' : employee.name;
}

function initials(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export default App;
